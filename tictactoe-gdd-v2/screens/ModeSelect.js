// screens/ModeSelect.js — Legacy redirect: kept for App.js case, redirects to 'play'
import { useEffect, useContext } from 'react';
import { AppContext } from '../App';

export default function ModeSelect() {
  const { navigate } = useContext(AppContext);
  useEffect(() => { navigate('play'); }, [navigate]);
  return null;
}