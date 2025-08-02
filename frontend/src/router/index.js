"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vue_router_1 = require("vue-router");
var useAuth_1 = require("../composables/useAuth");
var router = (0, vue_router_1.createRouter)({
    history: (0, vue_router_1.createWebHistory)(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/login',
            name: 'Login',
            component: function () { return Promise.resolve().then(function () { return require('../views/LoginView.vue'); }); },
            meta: { requiresGuest: true }
        },
        {
            path: '/',
            name: 'QueryList',
            component: function () { return Promise.resolve().then(function () { return require('../components/QueryList.vue'); }); },
            meta: { requiresAuth: true }
        },
        {
            path: '/query/:queryId',
            name: 'RentalList',
            component: function () { return Promise.resolve().then(function () { return require('../components/RentalList.vue'); }); },
            meta: { requiresAuth: true }
        }
    ]
});
// Auth Guard
router.beforeEach(function (to, from, next) {
    var _a = (0, useAuth_1.useAuth)(), isAuthenticated = _a.isAuthenticated, loading = _a.loading;
    // 等待認證狀態載入完成
    if (loading.value) {
        // 可以顯示載入頁面，這裡簡單等待
        var checkAuth_1 = function () {
            if (!loading.value) {
                // 載入完成，重新檢查路由
                if (to.meta.requiresAuth && !isAuthenticated.value) {
                    next('/login');
                }
                else if (to.meta.requiresGuest && isAuthenticated.value) {
                    next('/');
                }
                else {
                    next();
                }
            }
            else {
                // 繼續等待
                setTimeout(checkAuth_1, 50);
            }
        };
        checkAuth_1();
        return;
    }
    // 需要認證的頁面
    if (to.meta.requiresAuth && !isAuthenticated.value) {
        next('/login');
        return;
    }
    // 已登入用戶不應該看到登入頁面
    if (to.meta.requiresGuest && isAuthenticated.value) {
        next('/');
        return;
    }
    next();
});
exports.default = router;
