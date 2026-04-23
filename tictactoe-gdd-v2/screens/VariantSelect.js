// screens/VariantSelect.js — Legacy redirect: kept for App.js case, redirects to 'play'
// The new variant selection is in PlayScreen. This exists only as a safety fallback.
import { useEffect, useContext } from 'react';
import { AppContext } from '../App';

export default function VariantSelect() {
  const { navigate } = useContext(AppContext);
  useEffect(() => { navigate('play'); }, [navigate]);
  return null;
}