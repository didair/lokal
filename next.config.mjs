/** @type {import('next').NextConfig} */
const nextConfig = {
	outputFileTracingExcludes: {
		'*': ['./data/**/*', './test_data/**/*'],
	},
	/**
	 *
	 * @param {import('webpack').Configuration} config
	 * @param {import('next/dist/server/config-shared').WebpackConfigContext} context
	 * @returns {import('webpack').Configuration}
	 */
	webpack: (config, { isServer }) => {
		config.watchOptions = {
			...config.watchOptions,
			ignored: ['**/data/**', '**/test_data/**'],
		};

		if (!isServer) {
			config.module.rules.push({
				test: /data\/.*/,
				loader: 'ignore-loader',
			});
		}

		return config;
	},
};

export default nextConfig;
