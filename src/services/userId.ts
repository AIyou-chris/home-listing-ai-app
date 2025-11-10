export const resolveUserId = (): string => {
	if (typeof window === 'undefined' || !window.localStorage) return 'local'
	try {
		const explicit = window.localStorage.getItem('hlai_user_id')
		if (explicit && typeof explicit === 'string') return explicit
		const admin = window.localStorage.getItem('adminUser')
		if (admin) return 'admin_local'
	} catch (error) {
		console.warn('[userId] Failed to read stored user id', error)
	}
	return 'local'
}
