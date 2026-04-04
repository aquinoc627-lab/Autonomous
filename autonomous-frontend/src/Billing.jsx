import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { MdCheckCircle, MdLockOutline, MdRocketLaunch, MdOutlineArchitecture, MdAutoFixHigh } from 'react-icons/md';
import { useSearchParams } from 'react-router-dom';
import './Billing.css';

const TIER_FEATURES = {
  free_trial: ['14-Day Free Access', '1 Active AI Agent', 'Basic Recon Tools'],
  operative: ['Standard Tool Arsenal', 'Node-Based Playbooks', 'Up to 5 AI Agents', 'Priority Support'],
  commander: ['Generative UI Dashboards', '3D Target Portals', 'Swarm Intelligence', 'API Access'],
  nexus_prime: ['Tier 5 Quantum Warfare', 'Shor\'s Decryption Engine', 'HNDL Cryo-Vault', 'Dedicated Account Manager'],
};

export default function Billing() {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus(sessionId);
    }
  }, [sessionId]);

  const pollPaymentStatus = async (sid, attempts = 0) => {
    if (attempts >= 5) {
      setPaymentStatus({ type: 'error', msg: 'Payment verification timed out. Contact support.' });
      return;
    }
    
    setPaymentStatus({ type: 'pending', msg: 'Verifying payment...' });
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/billing/checkout-status/${sid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.payment_status === 'paid') {
        setPaymentStatus({ type: 'success', msg: 'Payment successful! Your account has been upgraded. Please refresh the page.' });
      } else if (data.status === 'expired') {
        setPaymentStatus({ type: 'error', msg: 'Checkout session expired.' });
      } else {
        setTimeout(() => pollPaymentStatus(sid, attempts + 1), 2000);
      }
    } catch (err) {
      setPaymentStatus({ type: 'error', msg: 'Failed to verify payment status.' });
    }
  };

  const handleCheckout = async (tierId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const packageId = `${tierId}_${billingCycle}`;
      
      const res = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          package_id: packageId,
          origin_url: window.location.origin
        })
      });
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned.");
      }
    } catch (err) {
      alert("Failed to initiate checkout: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="billing-container">
      <div className="billing-header">
        <h2><MdLockOutline /> Subscription & Billing</h2>
        <p>Upgrade your clearance level to access advanced capabilities.</p>
        
        {paymentStatus && (
          <div className={`billing-alert alert-${paymentStatus.type}`}>
            {paymentStatus.msg}
          </div>
        )}

        <div className="billing-cycle-toggle">
          <span className={billingCycle === 'monthly' ? 'active' : ''}>Monthly</span>
          <label className="switch">
            <input type="checkbox" checked={billingCycle === 'annual'} onChange={(e) => setBillingCycle(e.target.checked ? 'annual' : 'monthly')} />
            <span className="slider round"></span>
          </label>
          <span className={billingCycle === 'annual' ? 'active' : ''}>Annually (Save 16%)</span>
        </div>
      </div>

      <div className="pricing-grid">
        
        {/* OPERATIVE TIER */}
        <div className={`pricing-card ${user?.tier === 'operative' ? 'current-tier' : ''}`}>
          <div className="tier-icon" style={{ color: 'var(--neon-green)' }}><MdRocketLaunch /></div>
          <h3>Operative</h3>
          <div className="price">
            ${billingCycle === 'monthly' ? '49' : '490'} <span>/ {billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
          </div>
          <ul className="feature-list">
            {TIER_FEATURES.free_trial.map((f, i) => <li key={i} className="included"><MdCheckCircle /> {f}</li>)}
            {TIER_FEATURES.operative.map((f, i) => <li key={i}><MdCheckCircle /> {f}</li>)}
          </ul>
          <button 
            className="btn btn-primary tier-btn" 
            onClick={() => handleCheckout('operative')}
            disabled={loading || user?.tier === 'operative'}
            style={{ background: 'var(--neon-green)', color: '#000' }}
          >
            {user?.tier === 'operative' ? 'Current Plan' : 'Select Operative'}
          </button>
        </div>

        {/* COMMANDER TIER */}
        <div className={`pricing-card featured ${user?.tier === 'commander' ? 'current-tier' : ''}`}>
          <div className="tier-badge">Most Popular</div>
          <div className="tier-icon" style={{ color: 'var(--neon-cyan)' }}><MdOutlineArchitecture /></div>
          <h3>Commander</h3>
          <div className="price">
            ${billingCycle === 'monthly' ? '149' : '1490'} <span>/ {billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
          </div>
          <ul className="feature-list">
            <li className="included"><MdCheckCircle /> All Operative Features</li>
            {TIER_FEATURES.commander.map((f, i) => <li key={i}><MdCheckCircle /> {f}</li>)}
          </ul>
          <button 
            className="btn btn-primary tier-btn" 
            onClick={() => handleCheckout('commander')}
            disabled={loading || user?.tier === 'commander'}
          >
            {user?.tier === 'commander' ? 'Current Plan' : 'Select Commander'}
          </button>
        </div>

        {/* NEXUS PRIME TIER */}
        <div className={`pricing-card prime ${user?.tier === 'nexus_prime' ? 'current-tier' : ''}`}>
          <div className="tier-icon" style={{ color: '#ff0040' }}><MdAutoFixHigh /></div>
          <h3>Nexus Prime</h3>
          <div className="price">
            ${billingCycle === 'monthly' ? '499' : '4990'} <span>/ {billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
          </div>
          <ul className="feature-list">
            <li className="included"><MdCheckCircle /> All Commander Features</li>
            {TIER_FEATURES.nexus_prime.map((f, i) => <li key={i} style={{ color: '#fff' }}><MdCheckCircle color="#ff0040" /> {f}</li>)}
          </ul>
          <button 
            className="btn btn-primary tier-btn" 
            onClick={() => handleCheckout('nexus_prime')}
            disabled={loading || user?.tier === 'nexus_prime'}
            style={{ background: '#ff0040', color: '#fff', border: 'none' }}
          >
            {user?.tier === 'nexus_prime' ? 'Current Plan' : 'Select Nexus Prime'}
          </button>
        </div>

      </div>
    </div>
  );
}
