import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const cartFromStorage = localStorage.getItem('@RocketShoes:cart');

    if (cartFromStorage) {
      return JSON.parse(cartFromStorage);
    }

    return [];
  });

  const checkIfExistInCart = (productId: number) => {
    const productInCart = cart.find(cartProduct => cartProduct.id === productId)

    return productInCart
  }

  const checkStockQuantity = async (productId: number, amount: number) => {
    const stock: Stock = (await api.get(`stock/${productId}`)).data

    return stock.amount >= amount
  }

  const addProduct = async (productId: number) => {
    try {
      const productInCart = checkIfExistInCart(productId)

      const amount = (productInCart?.amount || 0) + 1

      const amountAvailableInStock = await checkStockQuantity(productId, amount)

      if (amountAvailableInStock) {
        let newProduct: Product

        if (productInCart) {
          newProduct = productInCart

          newProduct.amount = amount
        } else {
          const product: Product = (await api.get(`products/${productId}`)).data

          newProduct = product

          newProduct.amount = amount
        }

        setCart([...cart, newProduct])
        
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, newProduct]))
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const existingProduct = cart.find(product => product.id === productId)

      if (!existingProduct) throw new Error()

      const updatedCart = cart.filter(product => product.id !== productId)

      setCart(updatedCart)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return

      const amountAvailableInStock = await checkStockQuantity(productId, amount)

      if (amountAvailableInStock) {
        let updatedCart: Product[] = [...cart]

        const productIndex = cart.findIndex(cartProduct => cartProduct.id === productId)
  
        updatedCart[productIndex].amount = amount
  
        setCart(updatedCart)
  
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
