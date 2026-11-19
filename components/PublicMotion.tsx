'use client';
import { useEffect } from 'react';
export default function PublicMotion() {
  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const targets = document.querySelectorAll('.ac-section-heading,.ac-features article,.ac-workflow-grid,.ac-access,.ac-talent,.ac-bottom');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold: .08 });
    targets.forEach(el => { el.classList.add('reveal-ready'); observer.observe(el); });
    return () => { observer.disconnect(); targets.forEach(el => el.classList.remove('reveal-ready')); };
  }, []);
  return null;
}
