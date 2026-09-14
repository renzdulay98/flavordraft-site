// Values that come from the build itself rather than from configuration.
// The site is rebuilt on every push (see .github/workflows/deploy.yml), so the
// year the footer shows is the year of the last deploy.
export default {
  year: new Date().getFullYear()
};
