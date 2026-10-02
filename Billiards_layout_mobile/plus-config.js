/* 9BOARD Mobile - Free / Plus plan configuration
 * This file is intentionally isolated from the existing layout/editor code.
 * Existing billiards controls must not be changed from here.
 */
(function () {
  'use strict';

  const PLAN = Object.freeze({
    FREE: 'free',
    PLUS: 'plus'
  });

  const LIMITS = Object.freeze({
    free: Object.freeze({
      localLayouts: 5,
      matchRecords: 10,
      cloudSave: false,
      deviceSync: false,
      layoutMatchLink: false,
      backup: false,
      androidShare: false
    }),
    plus: Object.freeze({
      localLayouts: Infinity,
      matchRecords: Infinity,
      cloudSave: true,
      deviceSync: true,
      layoutMatchLink: true,
      backup: true,
      androidShare: true
    })
  });

  let currentPlan = PLAN.FREE;
  let currentUser = null;

  function normalizePlan(plan) {
    return plan === PLAN.PLUS ? PLAN.PLUS : PLAN.FREE;
  }

  function setSession(user, plan) {
    currentUser = user || null;
    currentPlan = currentUser ? normalizePlan(plan) : PLAN.FREE;
    window.dispatchEvent(new CustomEvent('9board:planchange', {
      detail: getState()
    }));
  }

  function getState() {
    return {
      user: currentUser,
      loggedIn: !!currentUser,
      plan: currentPlan,
      isPlus: currentPlan === PLAN.PLUS,
      limits: LIMITS[currentPlan]
    };
  }

  function can(feature) {
    const limits = LIMITS[currentPlan];
    return Object.prototype.hasOwnProperty.call(limits, feature)
      ? limits[feature]
      : false;
  }

  function canAddLocalLayout(currentCount) {
    return currentPlan === PLAN.PLUS || Number(currentCount || 0) < LIMITS.free.localLayouts;
  }

  function canAddMatchRecord(currentCount) {
    return currentPlan === PLAN.PLUS || Number(currentCount || 0) < LIMITS.free.matchRecords;
  }

  window.NineBoardPlan = Object.freeze({
    PLAN,
    LIMITS,
    getState,
    setSession,
    can,
    canAddLocalLayout,
    canAddMatchRecord
  });
})();

/* Score-screen add-on only: load the chess clock without changing existing layout/editor code. */
(function(){
  const s=document.createElement('script');
  s.src='./score-clock.js?v=20261002-clock1';
  s.defer=true;
  document.head.appendChild(s);
})();
