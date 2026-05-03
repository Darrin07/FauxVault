/**
 * Function: validateRegistration(form)
 * Client-side validation for the registration form.
 * Returns an object of field-level error messages.
 * An empty returned object means all fields are valid.
 *
 *  - username: required, min 3 chars, alphanumeric + underscores only
 *  - email: required, basic format check (not RFC-compliant)
 *  - password: required, min 8 chars
 *  - confirmPassword: must match password
 *
 * @param {{ username: string, email: string, password: string, confirmPassword: string }} form
 * @returns {{ username?: string, email?: string, password?: string, confirmPassword?: string }}
 */

export function validateRegistration(form) {
    const errs = {}

    //validate username
    if (!form.username.trim()) errs.username = 'Username is required'
    else if (form.username.length < 3) errs.username = 'Username must be at least 3 characters'
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errs.username = 'Username can only contain letters, numbers, and underscores'

    //validate email
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format'

    //validate password
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 8) errs.password = 'Minimum 8 characters'

    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match'

    return errs
}
