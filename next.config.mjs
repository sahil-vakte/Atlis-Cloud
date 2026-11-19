/** @type {import('next').NextConfig} */
// The old site had 12 copy-pasted technology microsites. They now redirect to one dynamic job board.
const MICROSITES = ['pega', 'microsoft-dynamics-365', 'aras', 'workday', 'servicenow', 'oracle-cloud', 'cybersecurity', 'infor-m3', 'charles-river-crd', 'adobe', 'bloomberg'];
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverComponentsExternalPackages: ['mysql2', 'word-extractor', 'unpdf', 'exceljs', 'nodemailer', 'tesseract.js', '@napi-rs/canvas', 'jszip', 'libphonenumber-js'] },
  async redirects() {
    return MICROSITES.flatMap((s) => [
      { source: `/${s}`, destination: `/careers?technology=${s}`, permanent: true },
      { source: `/${s}/jobs`, destination: `/careers?technology=${s}`, permanent: true },
      { source: `/${s}/jobs/job-details/:slug`, destination: `/careers?technology=${s}`, permanent: false },
      { source: `/${s}/:rest*`, destination: `/careers?technology=${s}`, permanent: false },
    ]);
  },
};
export default nextConfig;
