import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Loading } from '@/components/loading';
import { endUserMasqueradingCompany, superAdminEndMasquerade } from '@/shared/service/b2b';
import { bcLogoutLogin } from '@/shared/service/bc';
import { isLoggedInSelector, store, useAppSelector } from '@/store';
import { clearCompanySlice } from '@/store/slices/company';

const logout = () => {
  return bcLogoutLogin().then((res) => {
    if (res.data.logout.result !== 'success') {
      throw new Error('Failed to logout');
    }
  });
};

const useEndMasquerade = () => {
  const isAgenting = useAppSelector(({ b2bFeatures }) => b2bFeatures.masqueradeCompany.isAgenting);
  const salesRepCompanyId = useAppSelector(({ b2bFeatures }) => b2bFeatures.masqueradeCompany.id);

  return useCallback(async () => {
    if (isAgenting) {
      superAdminEndMasquerade(Number(salesRepCompanyId));
    }
  }, [isAgenting, salesRepCompanyId]);
};

const useEndCompanyMasquerade = () => {
  const { selectCompanyHierarchyId } = useAppSelector(
    ({ company }) => company.companyHierarchyInfo,
  );

  return useCallback(async () => {
    if (selectCompanyHierarchyId) {
      await endUserMasqueradingCompany();
    }
  }, [selectCompanyHierarchyId]);
};

/*
 * How long to let the B2B token arrive before concluding the shopper is logged out.
 *
 * The previous 3s was too short: the BC-first login path makes two sequential authorisation
 * calls where the old path made one, so a slow-but-successful login could exceed it. Treating
 * that as a logout dispatches `on-logout`, the storefront destroys the session and bounces back,
 * the portal reloads and fails the same way -- the sign-out loop.
 */
const TOKEN_GRACE_PERIOD_MS = 7000;

export function CatalystLogin() {
  const navigate = useNavigate();
  const endMasquerade = useEndMasquerade();
  const endCompanyMasquerading = useEndCompanyMasquerade();
  const isLoggedIn = useAppSelector(isLoggedInSelector);
  const B2BToken = useAppSelector(({ company }) => company.tokens.B2BToken);
  const [searchParams] = useSearchParams();

  const loginFlag = searchParams.get('loginFlag');

  const [gracePeriodElapsed, setGracePeriodElapsed] = useState(false);

  useEffect(() => {
    setGracePeriodElapsed(false);

    const timeout = setTimeout(() => {
      setGracePeriodElapsed(true);
    }, TOKEN_GRACE_PERIOD_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [B2BToken]);

  useEffect(() => {
    // An absent token may simply still be in flight, so it only counts as a logout once the
    // grace period has passed without one arriving. `loggedOutLogin` is an explicit logout and
    // is acted on immediately.
    const isExplicitLogout = loginFlag === 'loggedOutLogin';
    const tokenMissingAfterWait = !B2BToken && gracePeriodElapsed;

    if (isExplicitLogout || tokenMissingAfterWait) {
      Promise.all([logout(), endMasquerade(), endCompanyMasquerading()])
        .catch(() => {
          navigate('/orders');
        })
        .then(() => {
          window.sessionStorage.clear();
          store.dispatch(clearCompanySlice());
          window.b2b.callbacks.dispatchEvent('on-logout');
        });
    } else if (B2BToken && isLoggedIn) {
      navigate('/orders');
    }
  }, [
    endCompanyMasquerading,
    endMasquerade,
    isLoggedIn,
    loginFlag,
    navigate,
    B2BToken,
    gracePeriodElapsed,
  ]);

  return <Loading />;
}
