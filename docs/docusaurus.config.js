// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';
const { join } = require('path');

const organizationName = "ChainSafe";
const projectName = "WebZjs";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'WebZjs Documentation',
  tagline: 'WebZjs is a JavaScript library for interacting with the Zcash blockchain',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: `https://${organizationName}.github.io`,
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: `/${projectName}/`,

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName, // Usually your GitHub org/user name.
  projectName, // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
			'docusaurus-plugin-typedoc-api',
			{
				projectRoot: join(__dirname, '..'),
				// Monorepo
				packages: [    {
          path: 'packages/webzjs-wallet',
          entry: 'webzjs_wallet.d.ts',
        },{
          path: 'packages/webzjs-keys',
          entry: 'webzjs_keys.d.ts',
        }, {
          path: 'packages/webzjs-requests',
          entry: 'webzjs_requests.d.ts',
        }],
				minimal: false,
				debug: true,
				changelogs: true,
				readmes: false,
        tsconfigName: 'docs/tsconfig.json',
			},
		]
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'WebZ.js Documentation',
        // logo: {
        //   alt: 'My Site Logo',
        //   src: 'img/logo.svg',
        // },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Guides and Tutorials',
          },
          {
            to: 'api',
            label: 'API',
            position: 'left',
          },
          {
            href: 'https://github.com/ChainSafe/WebZjs',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Guides and Tutorials',
                to: '/docs/intro',
              },
              {
                label: 'API',
                to: '/api',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/facebook/docusaurus',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} ChainSafe Systems, Inc. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
