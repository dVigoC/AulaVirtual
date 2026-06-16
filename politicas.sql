-- Permitir INSERT a cualquier usuario autenticado (anon key cuenta como autenticado en storage)
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'archivos-aula');

-- Permitir SELECT (leer/descargar) público
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
USING (bucket_id = 'archivos-aula');

-- Permitir DELETE
CREATE POLICY "Allow public deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'archivos-aula');