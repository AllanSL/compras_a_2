import { useState } from 'react'
import { ShoppingList } from './components/ShoppingList'

function App() {
  return (
    <div className="container">
      <h1>🛍️ Compras a 2</h1>
      <p>Organize suas compras em conjunto.</p>
      <div className="card">
        <ShoppingList />
      </div>
    </div>
  )
}

export default App
