# 🍒 Cherry - AI Executive Assistant

A modern AI-powered executive assistant website built with React, Tailwind CSS, and TanStack Start.

## ✨ Features

- **AI Chat Interface** - Conversational AI powered by Gemini through Lovable AI Gateway
- **Voice Input** - Speech-to-text capabilities for hands-free interaction
- **Modern UI** - Built with shadcn/ui components and Tailwind CSS v4
- **Responsive Design** - Works seamlessly across desktop, tablet, and mobile
- **Server-Side Rendering** - TanStack Start for optimal performance and SEO

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI Framework |
| TanStack Start | Full-Stack React Framework |
| TanStack Router | File-based Routing |
| TanStack Query | Server State Management |
| Tailwind CSS v4 | Styling |
| shadcn/ui | UI Components |
| Motion | Animations |
| Lovable AI Gateway | AI Provider (Gemini) |

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 20+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/cherry-executive-assistant.git
   cd cherry-executive-assistant
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
   ```
   
   For AI features, you need a Lovable API Key. Get one from your Lovable project settings.

4. **Start the development server**
   ```bash
   bun run dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
cherry-executive-assistant/
├── src/
│   ├── components/          # React components
│   │   ├── ai-elements/     # AI chat components
│   │   └── ui/              # shadcn/ui components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions & AI gateway
│   ├── routes/              # TanStack file-based routes
│   │   ├── api/             # API routes
│   │   ├── __root.tsx       # Root layout
│   │   └── index.tsx        # Homepage
│   ├── assets/              # Static assets (images, logos)
│   ├── styles.css           # Global styles & CSS variables
│   ├── router.tsx           # Router configuration
│   └── server.ts            # SSR entry point
├── public/                  # Public static files
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
└── wrangler.jsonc           # Cloudflare Workers config
```

## 🔗 Setting Up GitHub

### Option 1: Lovable GitHub Sync (Recommended)

The easiest way to sync your code with GitHub:

1. In the Lovable editor, click **Plus (+)** → **GitHub**
2. Click **Connect project**
3. Authorize GitHub access
4. Choose or create a repository (e.g., `cherry-executive-assistant`)
5. Done! Changes sync automatically in both directions

### Option 2: Manual Setup

1. **Download your code** from Lovable (Code Editor → Download)

2. **Create a new GitHub repository**
   - Go to [github.com/new](https://github.com/new)
   - Name it `cherry-executive-assistant`
   - Don't initialize with README (we have one already)

3. **Push your code**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Cherry AI Executive Assistant"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/cherry-executive-assistant.git
   git push -u origin main
   ```

## 🌐 Deployment

### Deploy with Lovable (Easiest)

Your app is already deployed at:
- **Production**: https://cherry-executive-assistant.lovable.app
- **Preview**: https://id-preview--63f22a2b-a3b7-4aa2-afa6-da1f06169170.lovable.app

### Deploy to Cloudflare Pages

1. Connect your GitHub repo to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Set build command: `bun run build`
3. Set output directory: `dist`
4. Add environment variables in Cloudflare dashboard

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

> ⚠️ **Note**: If deploying outside Lovable, you need your own `GEMINI_API_KEY`. The Lovable AI Gateway endpoint only works inside Lovable's infrastructure.

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/public key |
| `GEMINI_API_KEY` | For external deploy | Google Gemini API key (if not using Lovable AI Gateway) |

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run preview` | Preview production build |
| `bun run lint` | Run ESLint |
| `bun run format` | Format code with Prettier |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 💬 Support

For questions or issues:
- Check the [Lovable Documentation](https://docs.lovable.dev)
- Open an issue on GitHub

---

Built with ❤️ using [Lovable](https://lovable.dev)
