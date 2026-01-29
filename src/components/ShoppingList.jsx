import { useState, useEffect, useRef } from 'react';
import { searchProducts } from '../services/productApi';
import { db } from '../services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

const CATEGORIES = ['Cozinha', 'Quarto', 'Banheiro', 'Sala', 'Limpeza'];

export function ShoppingList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Escuta dados do Firebase em Tempo Real
  useEffect(() => {
    const q = query(collection(db, "shopping_list"), orderBy("created_at", "desc"));
    
    // onSnapshot cria uma conexão websocket que atualiza instantaneamente
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const firebaseItems = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        setItems(firebaseItems);
        setLoading(false);
    }, (error) => {
        console.error("Erro ao conectar com Firebase:", error);
        // Fallback para LocalStorage se o Firebase falhar (ex: sem internet/credenciais)
        const saved = localStorage.getItem('shopping_list_db');
        if (saved) setItems(JSON.parse(saved));
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const [newItem, setNewItem] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  // Inicializa com a primeira categoria da lista para garantir consistência visual/estado
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
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

  const addItemToList = async (product) => {
    try {
        await addDoc(collection(db, "shopping_list"), {
            name: product.name,
            image: product.image,
            price: product.price,
            store: product.brands,
            category: selectedCategory,
            completed: false,
            created_at: new Date()
        });
        setNewItem('');
        setSuggestions([]);
    } catch (e) {
        console.error("Erro ao adicionar item: ", e);
        alert("Erro ao salvar. Verifique se o Firebase está configurado.");
    }
  };

  const updateCategory = async (id, newCategory) => {
    // setItems Otimista (opcional, o Firebase é rapido o suficiente para não precisar)
    await updateDoc(doc(db, "shopping_list", id), {
        category: newCategory
    });
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

  const filteredItems = filterCategory === 'Todas' 
    ? items 
    : items.filter(item => item.category === filterCategory);

  const total = filteredItems.reduce((acc, item) => {
    // Só soma se não estiver marcado como comprado? Ou soma tudo? 
    // Geralmente lista de compras soma tudo o que está listado (planejado).
    // Se quiser somar só o que falta comprar: !item.completed
    // Vou somar TUDO (Orçamento total) e talvez mostrar o "falta comprar"
    return acc + parsePrice(item.price);
  }, 0);

  const toggleItem = async (id) => {
    const item = items.find(i => i.id === id);
    if (item) {
        await updateDoc(doc(db, "shopping_list", id), {
            completed: !item.completed
        });
    }
  };

  const deleteItem = async (id) => {
    if (confirm("Tem certeza que deseja remover este item?")) {
        await deleteDoc(doc(db, "shopping_list", id));
    }
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
                                // Atualiza localmente o modal apenas para feedback visual imediato
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
