try {
  const url = new URL(window.APP_CONFIG?.appsScriptUrl);
  if (url.protocol !== "https:" || url.hostname !== "script.google.com" || !url.pathname.endsWith("/exec")) throw new Error();
  url.searchParams.set("admin", "1");
  const link = document.querySelector("#admin-link");
  link.href = url.href;
  link.hidden = false;
} catch {
  document.querySelector("#admin-error").textContent = "ยังไม่ได้ตั้งค่าระบบ กรุณาติดต่อผู้ดูแล";
}
