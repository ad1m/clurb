# Clurb Deployment Checklist

Use this checklist when deploying Clurb to production.

## Pre-Deployment

### 1. Environment Setup
- [ ] Create production Supabase project
- [ ] Run all database migrations in production
- [ ] Create production Vercel Blob store
- [ ] Get production xAI API key
- [ ] Set all environment variables in Vercel dashboard

### 2. Code Review
- [ ] All console.log statements reviewed/removed for production
- [ ] No sensitive data hardcoded
- [ ] All TypeScript errors resolved
- [ ] Build passes locally: `npm run build`

### 3. Database Configuration
- [ ] All tables created in production Supabase
- [ ] RLS policies applied and tested
- [ ] Database indexes created
- [ ] Auth email templates configured

### 4. Storage Configuration
- [ ] Vercel Blob storage created
- [ ] BLOB_READ_WRITE_TOKEN set in production
- [ ] Storage size limits configured (50MB max file)

---

## Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### 2. Deploy to Vercel
- [ ] Connect GitHub repo to Vercel
- [ ] Select Next.js framework preset
- [ ] Configure build settings (default should work)
- [ ] Add all environment variables
- [ ] Deploy

### 3. Environment Variables in Vercel
Navigate to: Vercel Dashboard → Project → Settings → Environment Variables

Add these for **Production**, **Preview**, and **Development**:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
XAI_API_KEY=xai-xxxxx
```

**Important:**
- Do NOT set `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` in production
- Use production keys, not development keys
- Store service_role_key securely (never expose to client)

---

## Post-Deployment Testing

### 1. Basic Functionality
- [ ] Homepage loads: `https://your-domain.com`
- [ ] Sign up works
- [ ] Email verification works
- [ ] Login works
- [ ] Redirects to /library after login

### 2. File Upload
- [ ] Upload dialog opens
- [ ] Can select/drag PDF file
- [ ] Upload progress shows
- [ ] File appears in library
- [ ] File URL is valid (check database)

### 3. PDF Reader
- [ ] Click file to open reader
- [ ] PDF loads and displays
- [ ] Page navigation works
- [ ] Zoom in/out works
- [ ] Text selection works
- [ ] Sticky notes can be created
- [ ] Chat panel opens

### 4. Social Features
- [ ] Can search for users
- [ ] Can send friend requests
- [ ] Can share files with friends
- [ ] Friend can access shared file
- [ ] Can see friend's reading progress

### 5. AI Features
- [ ] AI agent page loads: `/agent`
- [ ] Can send messages to AI
- [ ] AI responds with correct data
- [ ] Charts render properly
- [ ] Highlight AI works in reader

### 6. Performance
- [ ] Pages load quickly (<3s)
- [ ] Large PDFs render smoothly
- [ ] No console errors
- [ ] No failed network requests

---

## Security Checklist

### Authentication
- [ ] Email verification enabled
- [ ] Password requirements enforced (min 6 chars)
- [ ] Auth cookies are HTTP-only
- [ ] Session timeout configured

### Database Security
- [ ] RLS enabled on all tables
- [ ] Users can only access own data
- [ ] File sharing permissions work correctly
- [ ] No SQL injection vulnerabilities

### API Security
- [ ] All API routes verify authentication
- [ ] File upload size limits enforced (50MB)
- [ ] Rate limiting configured (if needed)
- [ ] CORS configured correctly

### Data Protection
- [ ] .env.local not committed to git
- [ ] Service role key never exposed to client
- [ ] API keys not logged
- [ ] Sensitive data encrypted in transit (HTTPS)

---

## Monitoring & Maintenance

### Setup Monitoring
- [ ] Vercel Analytics enabled
- [ ] Error tracking configured (Sentry/etc)
- [ ] Database usage monitored
- [ ] Blob storage usage monitored
- [ ] API usage monitored

### Backup Strategy
- [ ] Supabase automatic backups enabled
- [ ] Database backup schedule configured
- [ ] Critical data export strategy

---

## Rollback Plan

If deployment fails or critical bugs found:

1. **Immediate Rollback**
   ```
   Vercel Dashboard → Deployments → Click previous deployment → Promote to Production
   ```

2. **Fix and Redeploy**
   ```bash
   git revert HEAD
   git push origin main
   # Or fix the issue and commit
   ```

3. **Database Rollback**
   - If migration failed, restore from backup
   - Run rollback script if available

---

## Domain Configuration (Optional)

### Add Custom Domain
1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your domain: `clurb.com`
3. Configure DNS:
   - Type: A
   - Name: @
   - Value: 76.76.21.21
4. Add www subdomain (optional)
5. Wait for DNS propagation (up to 48 hours)

### SSL Certificate
- [ ] Vercel auto-generates SSL (should be automatic)
- [ ] HTTPS redirect enabled
- [ ] Certificate valid and not expired

---

## Performance Optimization

### Before Launch
- [ ] Enable Next.js image optimization
- [ ] Configure CDN for static assets
- [ ] Set up caching headers
- [ ] Optimize PDF loading strategy
- [ ] Add loading states everywhere

### After Launch
- [ ] Monitor Vercel Analytics
- [ ] Check Core Web Vitals
- [ ] Optimize slow queries
- [ ] Add database indexes if needed

---

## Launch Checklist

### Final Review
- [ ] All features tested
- [ ] All security measures in place
- [ ] Monitoring configured
- [ ] Backup strategy confirmed
- [ ] Team trained on using app

### Soft Launch
- [ ] Deploy to production
- [ ] Test with small group of users
- [ ] Monitor for errors
- [ ] Collect feedback
- [ ] Fix critical issues

### Public Launch
- [ ] Announce on social media
- [ ] Send launch emails
- [ ] Monitor traffic and usage
- [ ] Be ready for support requests

---

## Supabase Production Settings

### Auth Configuration
1. Go to Authentication → Settings
2. Enable Email Confirmations
3. Configure Email Templates:
   - Confirmation email
   - Password reset email
   - Magic link email
4. Set Site URL: `https://your-domain.com`
5. Add Redirect URLs:
   - `https://your-domain.com/library`
   - `https://your-domain.com/auth/callback`

### Database Settings
1. Enable Point-in-time Recovery (PITR)
2. Set connection pooling if needed
3. Configure database backups
4. Monitor database size

---

## Support & Maintenance

### User Support
- [ ] Create support email/channel
- [ ] Document common issues
- [ ] Create FAQ page
- [ ] Set up feedback form

### Regular Maintenance
- [ ] Weekly: Check error logs
- [ ] Weekly: Monitor database size
- [ ] Monthly: Review API usage
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Security audit

---

## Emergency Contacts

Document emergency contacts for:
- Vercel support
- Supabase support
- xAI support
- DNS provider
- Team members

---

## Success Metrics

Track these metrics after launch:
- [ ] User signups per day
- [ ] Files uploaded per day
- [ ] Active users per day
- [ ] AI agent queries per day
- [ ] Average session duration
- [ ] Error rate
- [ ] Page load times

---

## Post-Launch

After successful deployment:
1. Monitor for 48 hours continuously
2. Address any critical bugs immediately
3. Collect user feedback
4. Plan next iteration
5. Celebrate! 🎉

---

## Notes

- Keep this checklist updated as you add features
- Share with team members
- Review before each deployment
- Learn from any issues that occur
