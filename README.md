# Swiss Legal QA App

A Next.js application that provides answers to legal questions based on the Swiss Civil Code, using OpenAI's GPT model for natural language processing.

## Features

- Ask questions about Swiss law in natural language
- Get AI-powered answers with relevant article citations
- Find the most relevant articles from the Swiss Civil Code
- Clean and intuitive user interface

## Tech Stack

- Next.js 14
- TypeScript
- OpenAI API
- Tailwind CSS

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

The application is deployed on Vercel. To deploy your own version:

1. Fork this repository
2. Create a new project on Vercel
3. Connect your GitHub repository
4. Add your environment variables in the Vercel dashboard
5. Deploy!

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key

## License

MIT
