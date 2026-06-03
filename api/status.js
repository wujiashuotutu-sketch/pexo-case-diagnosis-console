export default function handler(req, res) {
  res.status(200).json({
    mode: "vercel",
    env: {
      LANGFUSE_PUBLIC_KEY: Boolean(process.env.LANGFUSE_PUBLIC_KEY),
      LANGFUSE_SECRET_KEY: Boolean(process.env.LANGFUSE_SECRET_KEY),
      LANGFUSE_HOST: Boolean(process.env.LANGFUSE_HOST),
    },
  });
}
