import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import Cookies from 'js-cookie';

import {
  createBrowserRouter,
  RouterProvider
} from 'react-router-dom'
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

const cookieToken = Cookies.get("token");
let router;

if(cookieToken !== undefined) {
  router = createBrowserRouter([
    {
      path: "/",
      element: <Home />
    },
    {
      path: "/game",
      element: <App />
    }
  ])
} else {
  router = createBrowserRouter([
    {
      path: "/",
      element: <Login />
    },
    {
      path: "/register",
      element: <Register />
    }
  ])
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <RouterProvider router={router} />
)