# 🚀 Deployment Guide

## Quick Start

1. **Set up environment variables:**
   ```bash
   cp env.example .env.local
   # Edit .env.local and add your Google API key
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the application:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Testing

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test:all
```

## Production Deployment

### Vercel (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables in Vercel dashboard:
     - `GOOGLE_API_KEY`: Your Google AI API key
   - Deploy!

### Manual Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Start the production server:**
   ```bash
   npm start
   ```

## Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `GOOGLE_API_KEY` | Google AI API key | Yes | `AIzaSy...` |
| `NEXT_PUBLIC_APP_NAME` | Application name | No | `Intelligent Document Assistant` |
| `NEXT_PUBLIC_MAX_FILE_SIZE` | Max file size (bytes) | No | `10485760` |
| `NEXT_PUBLIC_ALLOWED_FILE_TYPES` | Allowed file types | No | `pdf,txt,docx,md` |

## Getting Google AI API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key
5. Add it to your environment variables

## Troubleshooting

### Common Issues

1. **"GOOGLE_API_KEY is required" error:**
   - Make sure you've added the API key to your environment variables
   - Restart your development server after adding the key

2. **File upload not working:**
   - Check that the file type is supported (PDF, TXT, DOCX, MD)
   - Ensure file size is under 10MB
   - Check browser console for errors

3. **AI queries not working:**
   - Verify your Google API key is valid
   - Check that you have uploaded and processed documents
   - Ensure your API quota hasn't been exceeded

### Performance Optimization

1. **Enable compression:**
   ```bash
   npm install compression
   ```

2. **Add caching headers:**
   - Configure CDN caching for static assets
   - Add cache headers for API responses

3. **Monitor performance:**
   - Use Vercel Analytics
   - Monitor API response times
   - Track error rates

## Security Considerations

1. **API Key Security:**
   - Never commit API keys to version control
   - Use environment variables for all secrets
   - Rotate keys regularly

2. **File Upload Security:**
   - Validate file types on both client and server
   - Implement file size limits
   - Scan uploaded files for malware

3. **Rate Limiting:**
   - Implement rate limiting for API endpoints
   - Add request throttling
   - Monitor for abuse

## Monitoring and Logging

1. **Error Tracking:**
   - Use services like Sentry or LogRocket
   - Monitor API errors
   - Track user experience issues

2. **Performance Monitoring:**
   - Monitor page load times
   - Track API response times
   - Monitor memory usage

3. **Analytics:**
   - Track user interactions
   - Monitor feature usage
   - Analyze user behavior

## Scaling Considerations

1. **Database:**
   - Consider using a proper database (PostgreSQL, MongoDB)
   - Implement proper indexing
   - Add connection pooling

2. **File Storage:**
   - Use cloud storage (AWS S3, Google Cloud Storage)
   - Implement CDN for file delivery
   - Add file compression

3. **Caching:**
   - Implement Redis for session storage
   - Add API response caching
   - Use CDN for static assets

## Support

For issues and questions:
- Check the [README.md](./README.md) for detailed documentation
- Review the test files for usage examples
- Check the API endpoints documentation
- Create an issue in the repository

---

**Happy coding! 🎉**
