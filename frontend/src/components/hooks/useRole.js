import { useContext } from 'react';
import { store } from '@/src/components/stateManagement/store';

export const useRole = () => {
  const { state: { role, groups, isAuthenticated, isHydrated, user, display_name, avatar }, dispatch } = useContext(store);

  /**
   * Helper — use groups (new) with role as fallback (backward compat)
   */
  const inGroup = (...names) => {
    if (!isAuthenticated) return false;
    if (Array.isArray(groups) && groups.length > 0) {
      return names.some(n => groups.includes(n));
    }
    // Fallback if groups not yet loaded or not present
    return role ? names.includes(role) : false;
  };

  const isAdmin = inGroup('admin');
  const isEditor = inGroup('editor', 'admin');
  const isContributor = inGroup('contributor', 'editor', 'admin');

  return {
    role,
    groups,
    isAuthenticated,
    isHydrated,
    user,
    display_name,
    avatar,
    inGroup,
    isAdmin,
    isEditor,
    isContributor,
    dispatch,
  };
};

