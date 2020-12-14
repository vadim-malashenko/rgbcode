<?php

/*
 * Plugin name: RGBCode Test1
 */

use RGBCode\Test1;

Test1::instance()->init( __FILE__ );

/*

add_action('admin_init', static function() {

    $h = fopen(ABSPATH . 'users.csv', 'rb');

    while ([$name, $email, $role] = fgetcsv($h)) {

        wp_insert_user([
            'user_login' => $name,
            'user_email' => $email,
            'role' => $role
        ]);
    }
});

*/