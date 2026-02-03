import { useEffect, useRef } from "react";

const useAutoLogout = (logoutAction, timeout = 6000) => {
  const timerRef = useRef(null);
  const actionRef = useRef(logoutAction);

  // 1. Simpan fungsi logout terbaru ke dalam Ref
  // Ini trik agar timer TIDAK kereset meski App.jsx me-render ulang
  useEffect(() => {
    actionRef.current = logoutAction;
  }, [logoutAction]);

  useEffect(() => {
    const runLogout = () => {
      if (actionRef.current) {
        actionRef.current();
      }
    };

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      // Set timer baru
      timerRef.current = setTimeout(runLogout, timeout);
    };

    const events = [
      "load",
      "mousemove",
      "mousedown",
      "click",
      "scroll",
      "keypress",
    ];

    // Pasang Event Listener
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Jalankan timer pertama kali
    resetTimer();

    // Cleanup
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [timeout]); // <--- HANYA bergantung pada timeout, bukan logoutAction
};

export default useAutoLogout;
