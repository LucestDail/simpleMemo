import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    { path: '/',         name: 'Controller', component: () => import('../views/Controller.vue'), meta: { title: '컨트롤러' } },
    { path: '/board',    name: 'Board',      component: () => import('../views/Board.vue'),      meta: { title: '블랙보드', fullscreen: true } },
    { path: '/search',   name: 'Search',     component: () => import('../views/Search.vue'),     meta: { title: '검색 & 아카이브' } },
    { path: '/settings', name: 'Settings',   component: () => import('../views/Settings.vue'),   meta: { title: '설정' } },
  ],
});

router.afterEach((to) => {
  document.title = to.meta?.title ? `${to.meta.title} · SimpleMemo` : 'SimpleMemo';
});

export default router;
