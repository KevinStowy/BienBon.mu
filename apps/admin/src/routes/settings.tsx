import { createRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { TabNav } from '../components/ui/TabNav'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../auth/use-auth'
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useTags,
  useCreateTag,
  useDeleteTag,
  useAdminUsers,
} from '../hooks/use-settings'
import type { Category, Tag } from '../api/types'
import { Route as rootRoute } from './__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

function CategoriesTab() {
  const [newCategoryName, setNewCategoryName] = useState('')
  const categoriesQuery = useCategories()
  const createCategory = useCreateCategory()
  const deleteCategory = useDeleteCategory()

  const categories = categoriesQuery.data ?? []

  const handleAdd = () => {
    if (!newCategoryName.trim()) return
    const slug = newCategoryName.trim().toLowerCase().replace(/\s+/g, '-')
    createCategory.mutate({
      slug,
      nameFr: newCategoryName.trim(),
      nameEn: '',
      nameKr: '',
      icon: '',
      status: 'ACTIVE',
    } as Omit<Category, 'id' | 'basketCount'>)
    setNewCategoryName('')
  }

  const handleDelete = (id: string) => {
    deleteCategory.mutate({ id })
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Ajouter une categorie</CardTitle>
        </CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label htmlFor="new-category" className="sr-only">
              Nom de la categorie
            </label>
            <input
              id="new-category"
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Ex: Sushi, Vegan..."
              aria-label="Nom de la nouvelle categorie"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#1A1A1A]
                placeholder:text-[#9CA3AF]
                focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            isLoading={createCategory.isPending}
            onClick={handleAdd}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Ajouter
          </Button>
        </div>
      </Card>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
        <table className="w-full text-sm" aria-label="Liste des categories">
          <caption className="sr-only">Categories de paniers</caption>
          <thead className="bg-[#F7F4EF]">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Categorie</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-[#6B7280] uppercase">Paniers</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-[#6B7280] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {categoriesQuery.isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-[#9CA3AF]">Chargement...</td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-[#9CA3AF]">Aucune categorie</td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-[#F7F4EF] transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-[#1A1A1A]">
                      {cat.nameFr || (cat as unknown as Record<string, unknown>)['namesFr'] as string || cat.id}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[#6B7280]">{cat.basketCount ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      aria-label={`Supprimer la categorie ${cat.nameFr || ''}`}
                      onClick={() => handleDelete(cat.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#C62828] hover:bg-[#FFEBEE] rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TagsTab() {
  const [newTagName, setNewTagName] = useState('')
  const tagsQuery = useTags()
  const createTag = useCreateTag()
  const deleteTag = useDeleteTag()

  const tags = tagsQuery.data ?? []

  const handleAdd = () => {
    if (!newTagName.trim()) return
    const slug = newTagName.trim().toLowerCase().replace(/\s+/g, '-')
    createTag.mutate({
      slug,
      nameFr: newTagName.trim(),
      nameEn: '',
      nameKr: '',
      icon: '',
      description: '',
      isSystem: false,
      status: 'ACTIVE',
    } as Omit<Tag, 'id' | 'basketCount' | 'consumerCount'>)
    setNewTagName('')
  }

  const handleDelete = (id: string) => {
    deleteTag.mutate({ id })
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Ajouter un tag</CardTitle>
        </CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label htmlFor="new-tag" className="sr-only">Nom du tag</label>
            <input
              id="new-tag"
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Ex: Epice, Doux..."
              aria-label="Nom du nouveau tag"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white text-[#1A1A1A]
                placeholder:text-[#9CA3AF]
                focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            isLoading={createTag.isPending}
            onClick={handleAdd}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Ajouter
          </Button>
        </div>
      </Card>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
        <table className="w-full text-sm" aria-label="Liste des tags">
          <caption className="sr-only">Tags disponibles</caption>
          <thead className="bg-[#F7F4EF]">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Tag</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-[#6B7280] uppercase">Paniers</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-[#6B7280] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {tagsQuery.isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-[#9CA3AF]">Chargement...</td>
              </tr>
            ) : tags.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-[#9CA3AF]">Aucun tag</td>
              </tr>
            ) : (
              tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-[#F7F4EF] transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32]">
                      {tag.nameFr || (tag as unknown as Record<string, unknown>)['namesFr'] as string || tag.id}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[#6B7280]">{tag.basketCount ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      aria-label={`Supprimer le tag ${tag.nameFr || ''}`}
                      onClick={() => handleDelete(tag.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#C62828] hover:bg-[#FFEBEE] rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminUsersTab() {
  const { isSuperAdmin } = useAuth()
  const adminUsersQuery = useAdminUsers()
  const adminUsers = adminUsersQuery.data ?? []

  if (!isSuperAdmin) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-[#6B7280] font-semibold">
            Acces reserve aux Super Administrateurs
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
        <table className="w-full text-sm" aria-label="Administrateurs">
          <caption className="sr-only">Liste des utilisateurs administrateurs</caption>
          <thead className="bg-[#F7F4EF]">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Nom</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Role</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {adminUsersQuery.isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-[#9CA3AF]">Chargement...</td>
              </tr>
            ) : adminUsers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-[#9CA3AF]">Aucun administrateur</td>
              </tr>
            ) : (
              adminUsers.map((admin) => (
                <tr key={admin.id} className="hover:bg-[#F7F4EF] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#1A1A1A]">{admin.name}</p>
                    <p className="text-xs text-[#9CA3AF]">{admin.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={admin.role === 'SUPER_ADMIN' ? 'critical' : 'active'}>
                      {admin.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[#6B7280] text-xs">
                    {(admin as unknown as Record<string, unknown>)['status'] as string ?? 'ACTIVE'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inviter un administrateur</CardTitle>
        </CardHeader>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-4 max-w-sm"
        >
          <div>
            <label
              htmlFor="invite-email"
              className="block text-sm font-semibold text-[#1A1A1A] mb-1.5"
            >
              Adresse email
            </label>
            <input
              id="invite-email"
              type="email"
              placeholder="admin@bienbon.mu"
              aria-label="Email du nouvel administrateur"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white
                placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            />
          </div>
          <div>
            <label
              htmlFor="invite-role"
              className="block text-sm font-semibold text-[#1A1A1A] mb-1.5"
            >
              Role
            </label>
            <select
              id="invite-role"
              aria-label="Role du nouvel administrateur"
              className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white
                focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            >
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          <Button variant="primary" size="sm" type="submit" className="self-start">
            <Save className="w-4 h-4" aria-hidden="true" />
            Envoyer l'invitation
          </Button>
        </form>
      </Card>
    </div>
  )
}

function SettingsPage() {
  const [activeTab, setActiveTab] = useState('categories')
  const { isSuperAdmin } = useAuth()

  const tabs = [
    { id: 'categories', label: 'Categories' },
    { id: 'tags', label: 'Tags' },
    ...(isSuperAdmin ? [{ id: 'admins', label: 'Administrateurs' }] : []),
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Parametres</h1>
        <p className="text-sm text-[#6B7280] mt-1">Configuration de la plateforme</p>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-4">
        <TabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div role="tabpanel" id={`tabpanel-${activeTab}`}>
        {activeTab === 'categories' ? <CategoriesTab /> : null}
        {activeTab === 'tags' ? <TagsTab /> : null}
        {activeTab === 'admins' ? <AdminUsersTab /> : null}
      </div>
    </div>
  )
}
