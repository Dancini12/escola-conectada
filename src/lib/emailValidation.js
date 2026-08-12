export const SCHOOL_EMAIL_DOMAIN = '@escola.pr.gov.br'

export function isSchoolEmail(email) {
  return typeof email === 'string' && email.trim().toLowerCase().endsWith(SCHOOL_EMAIL_DOMAIN)
}
