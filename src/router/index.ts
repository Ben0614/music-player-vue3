import { provide } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import type { RouterScrollBehavior } from 'vue-router';

export const routes = [
  {
    path: '/SimplePlayer',
    name: 'simplePlayer',
    component: () => import( '@/views/SimplePlayer.vue'),
  },
  {
    path: '/MusicPlayer',
    name: 'musicPlayer',
    component: () => import( '@/views/MusicPlayer.vue'),
  },
  {
    path: '/UploadPlayer',
    name: 'uploadPlayer',
    component: () => import( '@/views/UploadPlayer.vue'),
  }
];

const scrollBehavior: RouterScrollBehavior = async (to, from, savedPosition) => {
    if (savedPosition) {
        // 如果有 savedPosition 可用，則返回 savedPosition 以允許瀏覽器捲動到該位置。
        return savedPosition;
    } else {
        // 捲動到頁面頂部
        return { left: 0, top: 0 };
    }
    // if (savedPosition) return savedPosition;

    // return { x: 0, y: 0 };
};

const router = createRouter({
    history: createWebHistory(),
    scrollBehavior: scrollBehavior,
    routes: routes
});

/**
 * Before each route update
 */
router.beforeEach((to, from, next) => {
    return next();
});

/**
 * After each route update
 */
// router.afterEach((to, from) => {});

export default router;

// provide('router', router);
// provide('route', router.currentRoute);