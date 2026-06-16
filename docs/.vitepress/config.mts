import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '我的技术成长记录',
  description: '记录学习与成长的每一步',
  lang: 'zh-CN',
  base: '/personworkkk/',

  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],

  themeConfig: {
    // 导航栏
    nav: [
      { text: '首页', link: '/' },
      { text: '文章', link: '/posts/' },
      { text: '关于我', link: '/about' },
    ],

    // 侧边栏
    sidebar: {
      '/posts/': [
        {
          text: '文章列表',
          items: [
            { text: '使用 VitePress 搭建个人博客', link: '/posts/hello-world' },
            { text: 'JavaScript 闭包详解', link: '/posts/js-closure' },
          ],
        },
      ],
    },

    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/kunbean' },
    ],

    // 页脚
    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2024 - 至今',
    },

    // 搜索
    search: {
      provider: 'local',
    },

    // 上次更新时间
    lastUpdated: {
      text: '最后更新于',
    },
  },

  // Markdown 配置
  markdown: {
    lineNumbers: true,
  },
})
