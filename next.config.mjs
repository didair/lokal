/** @type {import('next').NextConfig} */
const nextConfig = {
	allowedDevOrigins: ['lokal.test'],
	outputFileTracingExcludes: {
		'*': ['./data/**/*', './test_data/**/*'],
	},
};

export default nextConfig;
