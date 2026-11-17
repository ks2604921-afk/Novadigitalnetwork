import { useCallback, useEffect, useState } from 'react';
import Navbar from '@/nova/components/Navbar';
import BottomNav from '@/nova/components/BottomNav';
import SideRail from '@/nova/components/SideRail';
import Home from '@/nova/pages/Home';
import Clips from '@/nova/pages/Clips';
import SearchPage from '@/nova/pages/Search';
import Profile from '@/nova/pages/Profile';
import ComingSoon from '@/nova/pages/ComingSoon';
import CategoryPage from '@/nova/pages/CategoryPage';
import AllCategories from '@/nova/pages/AllCategories';
import { AuthProvider } from '@/lib/auth';
import WhosWatching from '@/nova/components/WhosWatching';
import SampleLogin from '@/nova/components/SampleLogin';
import StartupIntro from '@/nova/components/StartupIntro';
import GuestWelcome from '@/nova/components/GuestWelcome';
import GuestProfile from '@/nova/components/GuestProfile';
import NewUserSetup from '@/nova/components/NewUserSetup';
import TvLogin from '@/nova/components/TvLogin';
import { createProfileDraft, insertBeforeKids } from '@/nova/profile-rules';
import { loadProfiles, saveActiveProfile, saveProfiles, type StoredProfile } from '@/nova/profile-store';
import {
  clearCurrentPhone,
  isOldNovaUser,
  loadCurrentPhone,
  normalizePhoneNumber,
  registerNovaPhone,
  saveCurrentPhone,
} from '@/nova/user-account';
import { isDesktopDevice, isTvUserAgent } from '@/nova/watching-profile-rules';

const LOGIN_KEY = 'nova-sample-login';

function NovaApp() {
  const [activeNav, setActiveNav] = useState('home');
  const [activeCategory, setActiveCategory] = useState('Series');
  const [view, setView] = useState<'main' | 'category' | 'all-categories'>('main');
  const [railOpen, setRailOpen] = useState(false);
  const [picked, setPicked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);
  const [device, setDevice] = useState<'unknown' | 'desktop' | 'other'>('unknown');
  const [guest, setGuest] = useState(false);
  const [guestSettings, setGuestSettings] = useState(false);
  const [mobileLogin, setMobileLogin] = useState(false);
  const [bigScreen, setBigScreen] = useState(false);
  const [welcomeDone, setWelcomeDone] = useState(false);
  const [activePhone, setActivePhone] = useState('');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [settingsRequest, setSettingsRequest] = useState(0);
  const [requestedSetting, setRequestedSetting] = useState<string | null>(null);
  const openLogin = useCallback(() => {
    setMobileLogin(true);
  }, []);

  useEffect(() => {
    const fine = window.matchMedia?.('(pointer: fine)').matches ?? false;
    const forceTv = new URLSearchParams(window.location.search).get('tv') === '1';
    const desktop = !forceTv && isDesktopDevice(navigator.userAgent, fine, window.innerWidth);
    setDevice(desktop ? 'desktop' : 'other');
    setBigScreen(forceTv || desktop || isTvUserAgent(navigator.userAgent));
    try {
      if (localStorage.getItem(LOGIN_KEY) === '1') {
        setLoggedIn(true);
        const storedPhone = loadCurrentPhone();
        setActivePhone(storedPhone);
        if (storedPhone && !isOldNovaUser(storedPhone)) {
          setNeedsOnboarding(true);
        }
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    if (!bigScreen) return;
    const isScrollable = (el: HTMLElement) => {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      return (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 2;
    };
    const findScrollContainer = (start: EventTarget | null): HTMLElement | null => {
      let node = start instanceof HTMLElement ? start : document.activeElement instanceof HTMLElement ? document.activeElement : null;
      while (node && node !== document.body && node !== document.documentElement) {
        if (isScrollable(node)) return node;
        node = node.parentElement;
      }
      return null;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      if (document.querySelector('[data-nova-player-open="true"]')) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
        if (target.closest('[role="menu"], [role="listbox"], [data-nova-no-arrow-scroll]')) return;
      }
      const dir = event.key === 'ArrowDown' ? 1 : -1;
      const container = findScrollContainer(event.target);
      if (container) {
        const canScroll = dir > 0
          ? container.scrollTop + container.clientHeight < container.scrollHeight - 1
          : container.scrollTop > 1;
        if (canScroll) {
          event.preventDefault();
          const step = Math.max(180, Math.round(container.clientHeight * 0.45)) * dir;
          if (typeof container.scrollBy === 'function') container.scrollBy({ top: step, behavior: 'smooth' });
          else container.scrollTop += step;
        }
        return;
      }
      const root = (document.scrollingElement || document.documentElement) as HTMLElement;
      const viewportHeight = window.innerHeight || root.clientHeight;
      const canScrollRoot = dir > 0
        ? root.scrollTop + viewportHeight < root.scrollHeight - 1
        : root.scrollTop > 1;
      if (canScrollRoot) {
        event.preventDefault();
        const step = Math.max(200, Math.round(viewportHeight * 0.45)) * dir;
        if (typeof window.scrollBy === 'function') window.scrollBy({ top: step, behavior: 'smooth' });
        else root.scrollTop += step;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bigScreen]);

  const completeLogin = (phone?: string) => {
    const clean = normalizePhoneNumber(phone ?? '');
    setLoggedIn(true);
    setActivePhone(clean);
    if (clean) saveCurrentPhone(clean);
    const oldUser = clean ? isOldNovaUser(clean) : true;
    setNeedsOnboarding(!oldUser);
    try {
      localStorage.setItem(LOGIN_KEY, '1');
    } catch {
      /* storage unavailable */
    }
  };

  const handleNavChange = (id: string) => {
    setGuestSettings(false);
    setSettingsRequest(0);
    setRequestedSetting(null);
    setActiveNav(id);
    setView('main');
  };

  const openProfileSettings = () => {
    setActiveNav('profile');
    setView('main');
    setRequestedSetting(null);
    if (loggedIn) setSettingsRequest((n) => n + 1);
    else setGuestSettings(true);
  };

  useEffect(() => {
    const onOpenLang = () => {
      setActiveNav('profile');
      setView('main');
      setRequestedSetting('Language');
      if (loggedIn) setSettingsRequest((n) => n + 1);
      else setGuestSettings(true);
    };
    window.addEventListener('nova:open-language-settings', onOpenLang);
    return () => window.removeEventListener('nova:open-language-settings', onOpenLang);
  }, [loggedIn]);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setView('category');
  };

  const handleOpenAllCategories = () => {
    setActiveNav('home');
    setView('all-categories');
  };

  return (
    <div className="min-h-screen bg-nova-black">
      {!introDone && <StartupIntro onDone={finishIntro} />}
      {introDone && device !== 'unknown' && !bigScreen && !loggedIn && !guest && !mobileLogin && (
        <GuestWelcome onExplore={() => setGuest(true)} onLogin={openLogin} />
      )}
      {introDone && bigScreen && !loggedIn && !guest && !welcomeDone && (
        <GuestWelcome onContinue={() => setWelcomeDone(true)} />
      )}
      {/* TV/desktop: welcome poster first, then required login before entering the app. */}
      {introDone && bigScreen && !loggedIn && !guest && welcomeDone && (
        <TvLogin onDone={(phone) => { completeLogin(phone); setActiveNav('home'); setView('main'); }} />
      )}
      {mobileLogin && !loggedIn && !bigScreen && (
        <SampleLogin onDone={(phone) => { completeLogin(phone); setMobileLogin(false); setActiveNav('profile'); setView('main'); }} />
      )}
      {loggedIn && needsOnboarding && (
        <NewUserSetup
          onDone={({ name, avatar, languages }) => {
            if (languages[0]) {
              try {
                localStorage.setItem('nova-app-language', languages[0]);
              } catch {
                /* storage unavailable */
              }
            }
            const existing = loadProfiles();
            const newProfile: StoredProfile = {
              ...createProfileDraft(existing, `p${Date.now()}`),
              name,
              avatar,
              languages,
            };
            saveProfiles(insertBeforeKids(existing, newProfile));
            saveActiveProfile(newProfile.id);
            if (activePhone) registerNovaPhone(activePhone);
            setNeedsOnboarding(false);
            setPicked(true);
            setActiveNav('home');
            setView('main');
          }}
        />
      )}
      {loggedIn && !picked && !needsOnboarding && (
        <WhosWatching allowEdit={!bigScreen} tvMode={bigScreen} onPick={() => setPicked(true)} />
      )}
      {view !== 'all-categories' && <Navbar onSettings={activeNav === 'profile' && view === 'main' ? openProfileSettings : undefined} />}
      <SideRail
        activeNav={activeNav}
        onNavChange={handleNavChange}
        expanded={railOpen}
        onExpandedChange={setRailOpen}
        onOpenCategories={handleOpenAllCategories}
        categoriesActive={view === 'all-categories'}
        bigScreen={bigScreen}
        activeQuick={view === 'category' && activeNav === 'home' ? activeCategory : undefined}
        onPickCategory={(cat) => {
          setActiveNav('home');
          handleCategoryChange(cat);
        }}
      />
      <main className="relative isolate md:pl-[92px]">
        {view === 'category' && activeNav === 'home' ? (
          <CategoryPage category={activeCategory} onBack={() => setView('main')} />
        ) : view === 'all-categories' && activeNav === 'home' ? (
          <AllCategories onBack={() => setView('main')} onPick={handleCategoryChange} />
        ) : activeNav === 'clips' && !bigScreen ? (
          <Clips />
        ) : activeNav === 'search' ? (
          <SearchPage bigScreen={bigScreen} />
        ) : activeNav === 'profile' && !loggedIn ? (
          guestSettings ? (
            <Profile guest requestedSetting={requestedSetting} settingsRequest={settingsRequest} onGuestBack={() => { setGuestSettings(false); setRequestedSetting(null); }} onLogout={() => {}} />
          ) : (
            <GuestProfile onLogin={openLogin} onSettings={() => { setRequestedSetting(null); setGuestSettings(true); }} />
          )
        ) : activeNav === 'profile' ? (
          <Profile bigScreen={bigScreen} settingsRequest={settingsRequest} requestedSetting={requestedSetting} onLogout={() => {
            try { localStorage.removeItem(LOGIN_KEY); } catch { /* storage unavailable */ }
            clearCurrentPhone();
            setActivePhone('');
            setNeedsOnboarding(false);
            setLoggedIn(false);
            setPicked(false);
            setGuest(false);
            setWelcomeDone(true);
            setMobileLogin(!bigScreen);
            setRequestedSetting(null);
            setActiveNav('home');
            setView('main');
          }} />
        ) : activeNav === 'coming-soon' && !bigScreen ? (
          <ComingSoon />
        ) : (
          <Home />
        )}
      </main>
      <BottomNav
        activeNav={activeNav}
        onNavChange={handleNavChange}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        view={view}
        onOpenAllCategories={handleOpenAllCategories}
        bigScreen={bigScreen}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NovaApp />
    </AuthProvider>
  );
}
