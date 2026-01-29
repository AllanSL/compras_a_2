import { useState, useEffect, useRef } from 'react';
import { searchProducts } from '../services/productApi';

const CATEGORIES = ['Cozinha', 'Quarto', 'Banheiro', 'Sala', 'Limpeza'];

export function ShoppingList() {
  // Inicializa com dados do LocalStorage se existirem, senão usa os itens de teste
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('shopping_list_db');
    if (saved) {
        return JSON.parse(saved);
    }
    return [
        { 
            id: 1, 
            name: 'Arroz Branco Camil 5kg Tipo 1', 
            image: 'https://cdn.tendaatacado.com.br/img/item/0080/00008044.jpg', 
            price: 'R$ 29,90', 
            store: 'Tenda Atacado', 
            category: 'Cozinha', 
            completed: false 
        },
        { 
            id: 2, 
            name: 'Kit Detergente Ypê 500ml c/ 6 Unidades', 
            image: 'https://m.media-amazon.com/images/I/61Z6-hL8bXL._AC_SX679_.jpg', 
            price: 'R$ 15,49', 
            store: 'Amazon', 
            category: 'Limpeza', 
            completed: true 
        },
        { 
            id: 3, 
            name: 'Café Torrado e Moído Melitta 500g Tradicional', 
            image: 'https://m.media-amazon.com/images/I/61+9+85+xL._AC_SX679_.jpg', 
            price: 'R$ 18,50', 
            store: 'Mercado Livre', 
            category: 'Cozinha', 
            completed: false 
        }
    ];
  });

  // Salva no LocalStorage sempre que a lista mudar
  useEffect(() => {
    localStorage.setItem('shopping_list_db', JSON.stringify(items));
  }, [items]);

  const [newItem, setNewItem] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Geral');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [selectedItem, setSelectedItem] = useState(null); // Estado para o modal
  const searchRef = useRef(null);

  // Fecha sugestões ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
        if (searchRef.current && !searchRef.current.contains(event.target)) {
            setSuggestions([]);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchRef]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!newItem.trim()) return;

    setIsSearching(true);
    setSuggestions([]); // Limpa anteriores
    
    const results = await searchProducts(newItem);
    setSuggestions(results);
    setIsSearching(false);
  };

  const addItemToList = (product) => {
    setItems([
      ...items,
      { 
        id: Date.now(), 
        name: product.name, 
        image: product.image,
        price: product.price,
        store: product.brands,
        category: selectedCategory,
        completed: false 
      }
    ]);
    setNewItem('');
    setSuggestions([]);
  };

  const updateCategory = (id, newCategory) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, category: newCategory } : item
    ));
  };

  const parsePrice = (priceStr) => {
    if (!priceStr) return 0;
    // Remove "R$", espaços, e troca vírgula por ponto se necessário, ou remove formatação de milhar
    // Exemplo: "R$ 1.200,50" -> 1200.50
    try {
        const numbers = priceStr.replace(/[^\d,]/g, '').replace(',', '.');
        return parseFloat(numbers) || 0;
    } catch {
        return 0;
    }
  };

  const total = items.reduce((acc, item) => {
    // Só soma se não estiver marcado como comprado? Ou soma tudo? 
    // Geralmente lista de compras soma tudo o que está listado (planejado).
    // Se quiser somar só o que falta comprar: !item.completed
    // Vou somar TUDO (Orçamento total) e talvez mostrar o "falta comprar"
    return acc + parsePrice(item.price);
  }, 0);

  const filteredItems = filterCategory === 'Todas' 
    ? items 
    : items.filter(item => item.category === filterCategory);

  const toggleItem = (id) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const deleteItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const openItemDetails = (item) => {
      setSelectedItem(item);
  };

  return (
    <div className="shopping-list">
      {/* Modal de Detalhes do Produto */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedItem(null)}>✕</button>
            
            <div className="modal-image-container">
               {selectedItem.image ? (
                   <img src={selectedItem.image} alt="" className="modal-image" />
               ) : (
                   <span style={{color: '#999'}}>Sem imagem</span>
               )}
            </div>
            
            <div className="modal-body">
                <h2 className="modal-title">{selectedItem.name}</h2>
                <span className="modal-price-tag">{selectedItem.price || 'R$ --'}</span>
                
                <div className="modal-details-grid">
                    <div className="detail-item">
                        <span className="detail-label">Loja</span>
                        <span className="detail-value">{selectedItem.store || '-'}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Categoria</span>
                        <select 
                            value={selectedItem.category}
                            onChange={(e) => {
                            const newCat = e.target.value;
                            updateCategory(selectedItem.id, newCat);
                            setSelectedItem(prev => ({ ...prev, category: newCat }));
                            }}
                            className="modal-category-select"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <div className="modal-actions">
                <button 
                    onClick={() => { deleteItem(selectedItem.id); setSelectedItem(null); }} 
                    className="modal-delete-btn"
                >
                    Remover da Lista
                </button>
                </div>
            </div>
          </div>
        </div>
      )}

      <div className="controls-row">
        <div className="search-container" ref={searchRef}>
            <form onSubmit={handleSearch} className="add-item-form">
                <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Buscar produto..."
                    className="item-input"
                />
                <button type="submit" className="search-trigger-btn" disabled={isSearching}>
                    {isSearching ? <div className="btn-spinner"></div> : '🔍'}
                </button>
            </form>
            
            {isSearching && (
                <div className="search-loading-indicator">
                    <div className="spinner"></div>
                    <span>Consultando preços online...</span>
                </div>
            )}
            
            {suggestions.length > 0 && (
            <ul className="suggestions-list" ref={searchRef}>
                {suggestions.map((product) => (
                <li key={product.id} onClick={() => addItemToList(product)}>
                    {product.image && <img src={product.image} alt="" className="product-thumb" />}
                    <div className="product-info">
                        <span className="product-name">{product.name}</span>
                        <div className="product-meta">
                        {product.price && <span className="product-price">{product.price}</span>}
                        {product.brands && <span className="product-brand">{product.brands}</span>}
                        </div>
                    </div>
                </li>
                ))}
            </ul>
            )}
        </div>

        <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select"
            title="Categoria para novos itens"
        >
            {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
            ))}
        </select>
      </div>

      <div className="filter-bar">
          <span>Filtrar por:</span>
          {['Todas', ...CATEGORIES].map(cat => (
              <button 
                key={cat} 
                className={`filter-chip ${filterCategory === cat ? 'active' : ''}`}
                onClick={() => setFilterCategory(cat)}
              >
                  {cat}
              </button>
          ))}
      </div>

      <div className="table-container">
        <div className="shopping-list-container">
        {filteredItems.length === 0 ? (
           <div className="empty-state">
              <p>{items.length === 0 ? "Sua lista está vazia!" : "Nenhum item nesta categoria."}</p>
           </div>
        ) : (
           <div className="list-items">
              {filteredItems.map(item => (
                <div 
                    key={item.id} 
                    className={`list-item-row ${item.completed ? 'completed' : ''}`}
                    onClick={() => openItemDetails(item)}
                >
                    <div className="item-left" onClick={(e) => e.stopPropagation()}>
                        <label className="checkbox-container">
                            <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={(e) => { e.stopPropagation(); toggleItem(item.id); }}
                            />
                            <span className="checkmark"></span>
                        </label>
                    </div>
                    
                    <div className="item-center">
                         <span className="item-name">
                             {/* Limitar visualmente via CSS ou JS, mas aqui mantemos o JS solicitado */}
                             {item.name}
                         </span>
                         {item.price && <span className="item-price-mobile">{item.price}</span>}
                    </div>

                    <div className="item-right">
                        {/* Preço Desktop (ou tablet) - pode ocultar no mobile se já estiver em item-center */}
                        <span className="item-price-desktop">{item.price || '-'}</span>
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                            className="delete-btn-icon"
                            title="Remover"
                        >
                        🗑️
                        </button>
                    </div>
                </div>
              ))}
           </div>
        )}
      </div>

      <div className="total-display-bar">
        <span>Total Estimado:</span>
        <span className="total-value">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
      </div>
      </div>
      
      <div className="stats">
        {items.length > 0 && (
            <p>
                {items.filter(i => i.completed).length} de {items.length} itens comprados
            </p>
        )}
      </div>
    </div>
  );
}
