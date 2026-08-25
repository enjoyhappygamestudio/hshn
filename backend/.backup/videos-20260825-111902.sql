pg_dump: warning: there are circular foreign-key constraints on this table:
pg_dump: detail: video_comments
pg_dump: hint: You might not be able to restore the dump without using --disable-triggers or temporarily dropping the constraints.
pg_dump: hint: Consider using a full dump instead of a --data-only dump to avoid this problem.
--
-- PostgreSQL database dump
--

\restrict SOTyYGCzsjxlSWhdr7nEFDacXrlXHGSm5hdpYiP1aqoeIhfymK0llStj8aC5blN

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: product_videos; Type: TABLE DATA; Schema: public; Owner: hshn_user
--

COPY public.product_videos (id, product_id, url, thumbnail_url, duration, file_size, is_primary, sort_order, status, overlay_position, overlay_appear_at, overlay_disappear_at, created_at, title, video_category, description, views) FROM stdin;
168e0367-960c-4fe0-a323-fef1f0f0427b	ebadb050-4d09-4db9-9339-26996436c139	/uploads/videos/1784855952458-16376499_2160_3840_30fps.mp4	/uploads/videos/1784855952458-16376499_2160_3840_30fps_thumb.jpg	0	0	f	0	ready	bottom-left	0	\N	2026-07-23 13:51:45.566312+00	Tôm hùm Alaska - nhập khẩu	featured		28
e149e539-d7a4-41ac-bc41-4ae1740a4329	c1b2c3d4-0003-4000-8000-000000000001	/uploads/videos/1784855398303-test_upload.mp4	/uploads/videos/1784855398303-test_upload_thumb.jpg	0	0	f	0	ready	bottom-left	0	\N	2026-07-23 13:52:10.340052+00	Tôm sú tươi - giới thiệu (đã sửa)	featured		50
fa44bfa0-38b5-4d04-8cdc-cd32c43b0900	c1b2c3d4-0003-4000-8000-000000000002	/uploads/videos/1784814705156-test_tom.mp4	/uploads/videos/1784814705156-test_tom_thumb.jpg	0	0	f	0	ready	bottom-left	0	\N	2026-07-23 13:51:45.186724+00	Mực một nắng - chế biến	featured	\N	23
0c560724-7991-4403-8213-eb8a5d624547	40e0bced-0418-4999-aa96-fdca9012c06e	/uploads/videos/1784855632073-caÌ boÌ khoÌ.mp4	/uploads/videos/1784855632073-caÌ boÌ khoÌ_thumb.jpg	0	0	f	1	ready	bottom-left	0	\N	2026-07-24 01:13:55.91136+00	Cá bò tròn	dry	Cá bò tròn Quảng Ninh chuẩn ngon	115
62b603c5-d129-4cb7-a002-6261bafbbe01	c1b2c3d4-0003-4000-8000-000000000003	/uploads/videos/1784859434062-caÌ chiÌ vaÌng 2.mp4	/uploads/videos/1784859434062-caÌ chiÌ vaÌng 2_thumb.jpg	0	0	f	0	ready	bottom-left	0	\N	2026-07-24 02:17:22.950313+00	Cá chỉ vàng Cô Tô	\N	Cá chỉ vàng size vửa 100-120 con/kg	430
\.


--
-- Data for Name: video_comments; Type: TABLE DATA; Schema: public; Owner: hshn_user
--

COPY public.video_comments (id, video_id, customer_id, customer_name, content, created_at, parent_id, updated_at) FROM stdin;
4dfedbc5-ca5f-45eb-9cc3-fc2096752ba7	62b603c5-d129-4cb7-a002-6261bafbbe01	87576e34-cbb7-4bdf-878f-aed698dc226f	Lê Minh Đức	Dd	2026-07-25 12:03:36.330523+00	\N	\N
8d6f0e3a-900d-46ef-b93b-b685c0a7b57c	62b603c5-d129-4cb7-a002-6261bafbbe01	87576e34-cbb7-4bdf-878f-aed698dc226f	Lê Minh Đức	Ẻe	2026-07-25 12:03:39.656716+00	\N	\N
01eda0c4-e920-4379-90f4-b72453d896b9	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	Alo 1234	2026-07-25 12:20:23.095533+00	\N	\N
ad0bd88a-aeed-4a53-9e59-47f21907f4ee	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	Giá sao shop	2026-07-25 12:50:58.594865+00	\N	\N
36cfef88-0aca-42f0-85bd-940fc71f86c4	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	A	2026-07-25 12:51:15.187717+00	\N	\N
d2432d7d-d97b-49bc-9d69-e5622e231e66	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	Fff	2026-07-25 12:51:21.125903+00	\N	\N
005b6b3b-76cc-4003-ac37-963f1343f475	0c560724-7991-4403-8213-eb8a5d624547	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	Cá bò khô	2026-07-25 12:52:55.886069+00	\N	\N
3d6bfe84-1a1f-412a-8a9d-673853b0cd3a	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	Bdn	2026-07-25 12:56:04.375582+00	\N	\N
71ca934a-6633-4d38-a01d-03d622df882f	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	Bbnn	2026-07-25 12:56:06.432563+00	\N	\N
60338ff9-981e-4623-a8d4-87c8541d677a	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	Hhhj	2026-07-25 12:56:07.954951+00	\N	\N
0b6b7b80-d3dc-4fdc-b2a8-afe0eecd5027	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	Ssd	2026-07-25 12:56:09.158022+00	\N	\N
15a6f081-6a4b-4f88-ad13-e81a4761a3ac	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	Hhhdgd	2026-07-25 12:56:10.498571+00	\N	\N
72ea22d7-3674-438f-84aa-e2988c86c3f8	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	Hhsshbdh	2026-07-25 12:56:11.730288+00	\N	\N
9c9746b1-a4fa-4b04-8319-b40fec6e704c	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	Hshhđudu	2026-07-25 12:56:12.994032+00	\N	\N
e1994b89-5a67-4856-a268-69876c260087	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	Hshshdh	2026-07-25 12:56:14.180093+00	\N	\N
87801fba-1398-4b8d-9e6c-85a08ee5207c	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	Hshshdh	2026-07-25 12:56:15.52332+00	\N	\N
7da5dbcc-c339-4c62-b389-a0f9ad626272	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	Hshshdu	2026-07-25 12:56:16.70934+00	\N	\N
2e7cff95-0657-43bc-9194-b055f1df8eed	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	Hshshhd	2026-07-25 12:56:17.972496+00	\N	\N
09a0aee7-77f3-4ae2-a7ec-b70ff52db0f2	62b603c5-d129-4cb7-a002-6261bafbbe01	87576e34-cbb7-4bdf-878f-aed698dc226f	Lê Minh Đức	alo	2026-07-25 12:02:00.600145+00	\N	\N
dd33655a-6dc6-46bf-91d4-39b9336861e9	62b603c5-d129-4cb7-a002-6261bafbbe01	87576e34-cbb7-4bdf-878f-aed698dc226f	Lê Minh Đức	@Lê Minh Đức alo	2026-07-25 13:20:16.708489+00	09a0aee7-77f3-4ae2-a7ec-b70ff52db0f2	\N
28b609bd-bc52-40b7-84f5-98b3601ed2f8	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	@Lê Minh Đức jdjdbdb	2026-07-25 13:21:02.544059+00	4dfedbc5-ca5f-45eb-9cc3-fc2096752ba7	\N
f5eef00e-9bf6-4a72-8c0c-d328d6255a90	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	@Lê Minh Đức hjdhđh	2026-07-25 13:23:31.190687+00	4dfedbc5-ca5f-45eb-9cc3-fc2096752ba7	\N
a9b94dc2-9f69-456b-aca3-c5aba9a2e03c	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	@Lê Minh Đức clo	2026-07-25 14:10:56.4564+00	dd33655a-6dc6-46bf-91d4-39b9336861e9	\N
31a56db8-5b6d-49d0-b2e1-85c4b2778576	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	Le Son	Hjxjdbdkdkdkdbfbfkfkfkfnfbjfkishsbsdjdkkdjddjdbdbfkfkbfbdnffnfnfnnnjnnndjdjfjfnfnfnfnfjfjfnfbfbfbfnfbbbffbfbfbfbfnfnfnfnfnfnfn	2026-07-25 14:11:19.067356+00	\N	\N
9a260096-5215-4131-8f30-abfbae200797	0c560724-7991-4403-8213-eb8a5d624547	b4c724e0-e470-4f26-8d3f-172e23bb51d5	Hải Sản Bay	Giá sao vậy shop	2026-07-31 08:24:46.744575+00	\N	\N
\.


--
-- Data for Name: video_likes; Type: TABLE DATA; Schema: public; Owner: hshn_user
--

COPY public.video_likes (id, video_id, customer_id, created_at) FROM stdin;
c144cecb-57d5-424a-8f3b-c627a921ca63	62b603c5-d129-4cb7-a002-6261bafbbe01	87576e34-cbb7-4bdf-878f-aed698dc226f	2026-07-25 11:39:51.046715+00
85a6e0c3-abd9-428b-9c58-7f1875f36fc7	0c560724-7991-4403-8213-eb8a5d624547	bddb6494-91ce-4477-8b76-d84250a1ccea	2026-07-25 12:23:24.127385+00
cccbd26f-47b3-4be5-b1a0-79da63d80150	62b603c5-d129-4cb7-a002-6261bafbbe01	bddb6494-91ce-4477-8b76-d84250a1ccea	2026-07-25 12:24:32.90597+00
98d5075d-87bc-44e2-b3a6-a883575fa840	e149e539-d7a4-41ac-bc41-4ae1740a4329	bddb6494-91ce-4477-8b76-d84250a1ccea	2026-07-25 12:44:52.390838+00
3eec8986-6446-4bbf-8228-4523e8390a69	0c560724-7991-4403-8213-eb8a5d624547	b4c724e0-e470-4f26-8d3f-172e23bb51d5	2026-07-31 08:24:36.988913+00
\.


--
-- PostgreSQL database dump complete
--

\unrestrict SOTyYGCzsjxlSWhdr7nEFDacXrlXHGSm5hdpYiP1aqoeIhfymK0llStj8aC5blN

