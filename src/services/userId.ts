export const resolveUserId = (): string => {
	const explicit = localStorage.getItem('hlai_user_id');
	if (explicit && typeof explicit === 'string') return explicit;
	const admin = localStorage.getItem('adminUser');
	if (admin) return 'admin_local';
	return 'local';
};


