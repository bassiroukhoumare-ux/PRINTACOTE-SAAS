import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Helper to load .env variables if process.env is empty (useful for local Node.js testing/execution)
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = value.trim();
        }
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  const { article } = req.query;

  if (!article) {
    return res.status(400).send('ID de l\'article requis');
  }

  if (!uuidRegex.test(article)) {
    return res.status(400).send('Format de l\'ID de l\'article invalide');
  }

  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase URL or Anon Key is missing from env variables.');
      return res.status(500).send('Configuration error');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: news, error } = await supabase
      .from('news')
      .select('*')
      .eq('id', article)
      .single();

    if (error || !news) {
      console.error('Error fetching news:', error);
      return res.status(404).send('Article introuvable');
    }

    // Determine the template index.html path.
    // Vercel serverless functions include 'dist/index.html' when includeFiles is configured.
    let htmlPath = path.join(process.cwd(), 'dist', 'index.html');
    if (!fs.existsSync(htmlPath)) {
      htmlPath = path.join(process.cwd(), 'index.html');
    }

    if (!fs.existsSync(htmlPath)) {
      console.error('Template index.html not found at:', htmlPath);
      return res.status(500).send('Template error');
    }

    let html = fs.readFileSync(htmlPath, 'utf8');

    // Values to inject
    const title = `${news.title} — Actualités Printacoté`;
    const description = news.excerpt || 'Lisez notre dernier article sur le blog de Printacoté.';
    const imageUrl = news.image_url || 'https://www.printacote.com/og-image.png';
    const articleUrl = `https://www.printacote.com/actualites?article=${news.id}`;

    // Escape double quotes for safe inclusion in html attribute fields
    const safeTitle = title.replace(/"/g, '&quot;');
    const safeDescription = description.replace(/"/g, '&quot;');
    const safeImageUrl = imageUrl.replace(/"/g, '&quot;');
    const safeArticleUrl = articleUrl.replace(/"/g, '&quot;');

    // 1. Replace title tag
    html = html.replace(/<title>.*?<\/title>/gi, `<title>${safeTitle}</title>`);

    // 2. Replace description meta tags
    html = html.replace(/<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/gi, `<meta name="description" content="${safeDescription}">`);

    // 3. Replace og:title
    html = html.replace(/<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/gi, `<meta property="og:title" content="${safeTitle}">`);

    // 4. Replace og:description
    html = html.replace(/<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/gi, `<meta property="og:description" content="${safeDescription}">`);

    // 5. Replace og:image
    html = html.replace(/<meta\s+property=["']og:image["']\s+content=["'].*?["']\s*\/?>/gi, `<meta property="og:image" content="${safeImageUrl}">`);

    // 6. Replace og:url or inject it if not exists
    if (/<meta\s+property=["']og:url["']/i.test(html)) {
      html = html.replace(/<meta\s+property=["']og:url["']\s+content=["'].*?["']\s*\/?>/gi, `<meta property="og:url" content="${safeArticleUrl}">`);
    } else {
      html = html.replace(/<\/head>/i, `    <meta property="og:url" content="${safeArticleUrl}">\n</head>`);
    }

    // 7. Replace twitter:title
    html = html.replace(/<meta\s+name=["']twitter:title["']\s+content=["'].*?["']\s*\/?>/gi, `<meta name="twitter:title" content="${safeTitle}">`);

    // 8. Replace twitter:description
    html = html.replace(/<meta\s+name=["']twitter:description["']\s+content=["'].*?["']\s*\/?>/gi, `<meta name="twitter:description" content="${safeDescription}">`);

    // 9. Replace twitter:image
    html = html.replace(/<meta\s+name=["']twitter:image["']\s+content=["'].*?["']\s*\/?>/gi, `<meta name="twitter:image" content="${safeImageUrl}">`);

    // Set Cache-Control headers for Edge CDN caching (1 hour maximum, stale-while-revalidate for 10 minutes)
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    return res.status(200).send(html);
  } catch (err) {
    console.error('Serverless function error:', err);
    return res.status(500).send('Internal Server Error');
  }
}
