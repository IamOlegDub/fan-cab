export function isAdminEmail(email?: string | null) {
    return email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
}
