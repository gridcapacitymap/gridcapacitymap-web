document.addEventListener("DOMContentLoaded", function () {
  const $usr = document.getElementById("username");
  const $pwd = document.getElementById("password");

  if ($pwd && $usr && $usr.value === "guest") {
    $pwd.value = "GridmapGuestPassword";
  }
});
