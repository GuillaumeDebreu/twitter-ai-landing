const BACKEND_URL = 'https://peaceful-happiness-production-ef9d.up.railway.app';

async function handleUpgrade(event) {
  event.preventDefault();
  
  const button = event.target;
  const plan = button.dataset.plan;
  const period = button.dataset.period || 'monthly';
  
  // Get token from localStorage
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    // Not logged in - redirect to login
    window.location.href = '/login.html?redirect=pricing';
    return;
  }
  
  try {
    button.disabled = true;
    button.textContent = 'Loading...';
    
    const response = await fetch(`${BACKEND_URL}/subscription/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ plan, period })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Checkout failed');
    }
    
    const data = await response.json();
    
    // Redirect to Stripe Checkout
    window.location.href = data.checkoutUrl;
    
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Error creating checkout: ' + error.message + '. Please try again.');
    button.disabled = false;
    button.textContent = 'Upgrade';
  }
}

// Handle toggle between monthly/yearly pricing
function handlePricingToggle() {
  const toggle = document.getElementById('pricing-toggle');
  const monthlyPrices = document.querySelectorAll('.monthly-price');
  const yearlyPrices = document.querySelectorAll('.yearly-price');
  const yearlyBadges = document.querySelectorAll('.yearly-badge');
  
  if (toggle.checked) {
    // Show yearly pricing
    monthlyPrices.forEach(el => el.style.display = 'none');
    yearlyPrices.forEach(el => el.style.display = 'inline');
    yearlyBadges.forEach(el => el.style.display = 'inline-block');
    
    // Update button text and data-period for yearly
    updateButtonPeriods('yearly');
  } else {
    // Show monthly pricing
    monthlyPrices.forEach(el => el.style.display = 'inline');
    yearlyPrices.forEach(el => el.style.display = 'none');
    yearlyBadges.forEach(el => el.style.display = 'none');
    
    // Update button text and data-period for monthly
    updateButtonPeriods('monthly');
  }
}

// Update button text and data-period attributes
function updateButtonPeriods(period) {
  const premiumButton = document.querySelector('[data-plan="premium"]');
  const premiumPlusButton = document.querySelector('[data-plan="premium_plus"]');
  
  if (premiumButton) {
    if (period === 'yearly') {
      premiumButton.textContent = 'Upgrade to Premium - €3.99/mo (yearly)';
      premiumButton.dataset.period = 'yearly';
    } else {
      premiumButton.textContent = 'Upgrade to Premium - €4.99/mo';
      premiumButton.dataset.period = 'monthly';
    }
  }
  
  if (premiumPlusButton) {
    if (period === 'yearly') {
      premiumPlusButton.textContent = 'Upgrade to Premium+ - €7.99/mo (yearly)';
      premiumPlusButton.dataset.period = 'yearly';
    } else {
      premiumPlusButton.textContent = 'Upgrade to Premium+ - €9.99/mo';
      premiumPlusButton.dataset.period = 'monthly';
    }
  }
}

// Initialize pricing toggle if it exists
document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('pricing-toggle');
  if (toggle) {
    toggle.addEventListener('change', handlePricingToggle);
    // Initialize state
    handlePricingToggle();
  }
});
