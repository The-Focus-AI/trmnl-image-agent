import 'dotenv/config';

export async function GET(): Promise<Response> {
  return Response.json(
    {
      ok: true,
      service: 'cornwall-dispatch',
      configured: {
        parallelApiKey: Boolean(process.env.PARALLEL_API_KEY?.trim()),
        cronSecret: Boolean(process.env.CRON_SECRET?.trim()),
      },
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
