// screens/OnlineScreen.js — Legacy redirect: 'online' route now goes to play
// Kept for App.js case completeness, immediately redirects.
import { useEffect, useContext } from 'react';
import { AppContext } from '../App';

export default function OnlineScreen() {
  const { navigate } = useContext(AppContext);
  useEffect(() => { navigate('play'); }, [navigate]);
  return null;
}