export function requireProfile(navigate) {
  const profile = localStorage.getItem("userProfile");
  if (!profile) {
    navigate("/onboarding/profile");
  }
}
