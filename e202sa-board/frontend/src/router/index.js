import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    { path: '/', name: 'Controller', component: () => import('../views/Controller.vue'), meta: { title: '컨트롤러' } },
    { path: '/board', name: 'Board', component: () => import('../views/Board.vue'), meta: { title: '블랙보드' } },
  ],
});

router.afterEach((to) => {
  document.title = to.meta?.title ? `${to.meta.title} · e202sa-board` : 'e202sa-board';
});

export default router;
