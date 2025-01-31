import { Route } from 'react-router-dom';
import { Documents } from '../../pages/Documents';
import { NovoDocumento } from '../../pages/Documents/NovoDocumento';
import { EditDocument } from '../../pages/Documents/EditDocument';

export const documentsRoutes = (
  <Route path="documentos">
    <Route index element={<Documents />} />
    <Route path="novo" element={<NovoDocumento />} />
    <Route path=":id/edit" element={<EditDocument />} />
  </Route>
);