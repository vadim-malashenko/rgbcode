<?php

namespace RGBCode;

class Test1 {
	private static self $_instance;
	private string $_dir;
	private string $_url;

	protected array $_atts = [
		'limit' => 10
	];

	protected array $_columns = [
		[ 'id' => 'display_name', 'name' => 'Name', 'class' => 'sortable' ],
		[ 'id' => 'user_email', 'name' => 'Email', 'class' => 'sortable' ],
		[ 'id' => 'role', 'name' => 'Role', 'class' => '' ]
	];

	protected int $_limit = 10;
	protected int $_current = 0;
	protected string $_role = '';
	protected string $_orderBy = '';
	protected string $_order = 'ASC';

	protected \WP_User_Query $_query;
	protected array $_users = [];

	public static function instance(): self {
		return self::$_instance ?? ( self::$_instance = new self() );
	}

	public function init( string $file ): void {
		$id = $this->prefix( 'shortcode1' );

		$this->_dir = \plugin_dir_path( $file );
		$this->_url = \plugin_dir_url( $file );

		\add_shortcode( $id, $this->factory( $id, 10 ) );
		\add_action( "wp_ajax_{$id}", [ $this, 'shortcode1' ] );
		\add_action( 'wp_enqueue_scripts', [ $this, 'wp_enqueue_scripts' ] );
		\add_action( 'wp_enqueue_styles', [ $this, 'wp_enqueue_styles' ] );
	}

	public function factory( $id, $limit ): \Closure {
		return static function ( $atts ) use ( $id, $limit ): string {

			if ( ! \current_user_can( 'administrator' ) ) {
				return '';
			}

			$atts = \shortcode_atts(
				[
					'limit' => $limit
				],
				$atts
			);

			\update_option( $id, $atts );

			return "<div id=\"{$id}\"></div>";
		};
	}

	public function wp_enqueue_scripts(): void {
		// TODO It's a hack, need to be refactored
		$users = $this->getUsers();

		$id   = $this->prefix( 'shortcode1' );
		$path = $this->url( "assets/scripts/shortcode1.js" );
		$data = [
			'id'      => $id,
			'columns' => $this->getColumns(),
			'roles'   => $this->getRoles(),
			'last'    => $this->getLast(),
			'action'  => "/wp-admin/admin-ajax.php?action={$id}",
			'nonce'   => \wp_create_nonce( $id )
		];

		\wp_enqueue_script( $id, $path, false, null, true );
		\wp_localize_script( $id, $id, $data );

		$path = $this->url( "assets/styles/shortcode1.css" );

		\wp_enqueue_style( $id, $path, false, null );
	}

	public function shortcode1(): void {
		\check_ajax_referer( $this->prefix( 'shortcode1' ) );

		if ( \current_user_can( 'administrator' ) ) {

			\wp_send_json( [
				'rows'    => $this->getUsers(),
				'last'    => $this->getLast(),
				'current' => $this->getCurrent()
			] );
		}
	}

	public function getUsers(): array {
		$atts = \get_option( $this->prefix( 'shortcode1' ), $this->_atts );

		$this->_limit   = (int) $atts['limit'];
		$this->_current = ( \filter_input( INPUT_GET, 'page', FILTER_VALIDATE_INT ) ?? false ) ?: 1;
		$this->_role    = ( \filter_input( INPUT_GET, 'role', FILTER_SANITIZE_STRING ) ?? false ) ?: '';
		$this->_orderBy = ( \filter_input( INPUT_GET, 'orderBy', FILTER_SANITIZE_STRING ) ?? false ) ?: '';
		$this->_order   = ( \filter_input( INPUT_GET, 'order', FILTER_SANITIZE_STRING ) ?? false ) ?: 'ASC';

		global $wpdb;

		$this->_query = $this->getUserQuery();

		foreach ( $this->_users = $this->_query->get_results() as & $user ) {
			$user->role = key( \get_user_meta( $user->ID, "{$wpdb->prefix}capabilities", true ) ?: [ '' => '' ] );
			unset( $user->ID );
		}

		return $this->_users;
	}

	public function getColumns(): array {
		return $this->_columns;
	}

	public function getCurrent(): int {
		return $this->_current;
	}

	public function getLast(): int {
		return ceil( $this->_query->get_total() / $this->_limit );
	}

	protected function getUserQuery(): \WP_User_Query {
		$args = [
			'fields'      => [ 'ID', 'display_name', 'user_email' ],
			'offset'      => ( $this->_current - 1 ) * $this->_limit,
			'number'      => $this->_limit,
			'count_total' => true
		];

		if ( '' !== $this->_role ) {
			$args['role__in'] = [ $this->_role ];
		}

		if ( '' !== $this->_orderBy ) {
			$args['orderby'] = $this->_orderBy;
			$args['order']   = $this->_order;
		}

		return new \WP_User_Query( $args );
	}

	public function getRoles(): array {
		global $wp_roles;

		$roles = $wp_roles->roles;

		return array_reduce( array_keys( $roles ), static function ( $_roles, $role ) use ( $roles ): array {
			return array_merge( $_roles, [ [ 'value' => $role, 'text' => $roles[ $role ]['name'] ] ] );
		}, [] );
	}

	public function prefix( string $id ): string {
		return str_replace( '\\', '_', strtolower( static::class ) ) . "_{$id}";
	}

	public function path( string $path ): string {
		return "{$this->_dir}{$path}";
	}

	public function url( string $path ): string {
		return "{$this->_url}{$path}";
	}

	private function __construct() {
	}

	private function __clone() {
	}

	private function __wakeup() {
	}
}