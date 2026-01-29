export default async function handler(request, response) {
  // Configuração de CORS para permitir que seu front-end acesse esta função
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  const { query } = request; // Pega os parâmetros da URL (q, engine, etc)
  
  // Garante que a API Key esteja presente (pega das variáveis de ambiente do Vercel se não vier do front)
  const apiKey = query.api_key || process.env.VITE_SERPAPI_KEY;

  if (!apiKey) {
      return response.status(500).json({ error: 'API Key não configurada no servidor.' });
  }

  // Monta a URL da SerpApi
  const params = new URLSearchParams(query);
  params.set('api_key', apiKey); // Garante que a chave usada é a correta
  
  try {
    const serpUrl = `https://serpapi.com/search.json?${params.toString()}`;
    // console.log("Proxying to:", serpUrl); // Log para debug no Vercel Logs

    const res = await fetch(serpUrl);
    
    if (!res.ok) {
        const errorText = await res.text();
        return response.status(res.status).json({ error: errorText });
    }

    const data = await res.json();
    return response.status(200).json(data);

  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
