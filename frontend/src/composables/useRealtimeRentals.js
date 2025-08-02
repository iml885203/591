"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRealtimeRentals = void 0;
var vue_1 = require("vue");
var supabase_1 = require("../lib/supabase");
var useRealtimeRentals = function (queryId, onUpdate) {
    var subscription = null;
    (0, vue_1.onMounted)(function () {
        // Subscribe to rental changes
        subscription = supabase_1.supabase
            .channel('rental-changes')
            .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'rentals'
        }, function () {
            // Trigger update when there are new rentals
            onUpdate();
        })
            .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'query_rentals'
        }, function () {
            // Trigger update when query_rentals relationship changes
            onUpdate();
        })
            .subscribe();
    });
    (0, vue_1.onUnmounted)(function () {
        if (subscription) {
            subscription.unsubscribe();
        }
    });
};
exports.useRealtimeRentals = useRealtimeRentals;
