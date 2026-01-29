const API_KEY = import.meta.env.VITE_SERPAPI_KEY;

// Mock data para testes sem gastar API
const MOCK_PRODUCTS = [
  { product_id: '101', title: 'Leite Integral Piracanjuba 1L', thumbnail: 'https://m.media-amazon.com/images/I/61+9+85+xL._AC_SX679_.jpg', source: 'Amazon', price: 'R$ 5,99' },
  { product_id: '102', title: 'Arroz Tio João 5kg', thumbnail: 'https://cdn.tendaatacado.com.br/img/item/0080/00008044.jpg', source: 'Carrefour', price: 'R$ 32,90' },
  { product_id: '103', title: 'Feijão Carioca Camil 1kg', thumbnail: 'https://m.media-amazon.com/images/I/61Z6-hL8bXL._AC_SX679_.jpg', source: 'Mercado Livre', price: 'R$ 8,50' },
  { product_id: '104', title: 'Azeite de Oliva Andorinha 500ml', thumbnail: 'https://m.media-amazon.com/images/I/61Z6-hL8bXL._AC_SX679_.jpg', source: 'Pão de Açúcar', price: 'R$ 25,00' },
  { product_id: '105', title: 'Café Pilão 500g', thumbnail: 'https://m.media-amazon.com/images/I/61+9+85+xL._AC_SX679_.jpg', source: 'Amazon', price: 'R$ 16,90' }
];

export async function searchProducts(query) {
  if (!query || query.length < 3) return [];

  // MODO DESENVOLVIMENTO: Retorna dados falsos se a query começar com "test" ou se a API KEY não existir
  if (query.toLowerCase().startsWith('teste') || !API_KEY || API_KEY === 'sua_chave_da_serpapi_aqui') {
      console.log("Usando dados MOCK para economizar API");
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Filtra mocks simples
      return MOCK_PRODUCTS.filter(p => p.title.toLowerCase().includes(query.toLowerCase().replace('teste', '').trim()) || true).map(product => ({
        id: product.product_id || Math.random().toString(36).substr(2, 9),
        name: product.title,
        image: product.thumbnail || null,
        brands: product.source || product.merchant || '',
        price: product.price
      }));
  }

  // Se não tiver chave, retorna array vazio ou erro (silencioso para não quebrar o app)
  if (!API_KEY || API_KEY === 'sua_chave_da_serpapi_aqui') {
    console.warn("SerpAPI Key não configurada no arquivo .env");
    return [];
  }

  try {
    // Construindo a URL com os parâmetros específicos solicitados
    const params = new URLSearchParams({
      engine: "google_shopping_light", // Mudado para versão light/mobile
      q: query,
      location: "Araguaina, State of Tocantins, Brazil", // Localização específica
      google_domain: "google.com.br",
      hl: "pt-br",
      gl: "br",
      device: "mobile",
    //   sort_by: "1", // Tenta ordenar por menor preço ou relevância (dependendo da interpretação da API)
      api_key: API_KEY,
      num: "5"
    });

    // Usando proxy configurado no vite.config.js para evitar CORS
    const response = await fetch(
      `/api/serpapi/search.json?${params.toString()}`
    );
    
    if (!response.ok) throw new Error('Erro na busca SerpApi');
    
    const data = await response.json();
    
    if (!data.shopping_results) return [];

    return data.shopping_results.map(product => ({
      id: product.product_id || Math.random().toString(36).substr(2, 9),
      name: product.title,
      image: product.thumbnail || null,
      brands: product.source || product.merchant || '', // SerpApi retorna a loja/fonte em 'source'
      price: product.price ? product.price.replace(/\s*agora\s*/i, '').trim() : null
    }));
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    return [];
  }
}
