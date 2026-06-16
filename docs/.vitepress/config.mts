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
      { text: '写文章', link: '/editor' },
      { text: '简历', link: '/resume' },
      { text: '文档', link: '/guide/' },
      { text: '关于', link: '/about' },
    ],

    // 侧边栏
    sidebar: {
      '/posts/': [
        {
          text: '文章列表',
          items: [
            { text: '使用 VitePress 搭建个人博客', link: '/posts/hello-world' },
            { text: 'JavaScript 闭包详解', link: '/posts/js-closure' },
            { text: '测试', link: '/posts/%E6%B5%8B%E8%AF%95' },
            { text: '测试文件夹', link: '/posts/%E6%B5%8B%E8%AF%95%E6%96%87%E4%BB%B6%E5%A4%B9' },
            { text: '数据产品在Ai场景下具备的能力', link: '/posts/%E6%95%B0%E6%8D%AE%E4%BA%A7%E5%93%81%E5%9C%A8Ai%E5%9C%BA%E6%99%AF%E4%B8%8B%E5%85%B7%E5%A4%87%E7%9A%84%E8%83%BD%E5%8A%9B' },
            // AUTO_POSTS_END  // 新文章自动追加到此标记上方
          ],
        },
      ],
      '/guide/': [
        {
          text: '技术文档',
          items: [
            { text: '项目概述', link: '/guide/' },
            { text: '架构说明', link: '/guide/architecture' },
            { text: '在线编辑器', link: '/guide/editor' },
            { text: '主题定制', link: '/guide/theme' },
            { text: '部署流程', link: '/guide/deploy' },
            { text: '更新日志', link: '/guide/changelog' },
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
