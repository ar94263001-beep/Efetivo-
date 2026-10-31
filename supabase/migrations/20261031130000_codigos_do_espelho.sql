-- Códigos do Espelho de Pontos que faltavam no lançamento: outra obra, não trabalhava, demissão, compensação, em contratação.
alter table public.ponto drop constraint ponto_st_check;
alter table public.ponto add constraint ponto_st_check check (st in ('P','F','FJ','AT','FG','FE','OB','NT','D','C','EC'));
