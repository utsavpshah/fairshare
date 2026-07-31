import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const createGroupSchema = z.object({
  name: z.string().trim().min(2, 'Group name must be at least 2 characters.').max(80, 'Group name must be 80 characters or less.'),
  description: z.string().trim().max(280, 'Description must be 280 characters or less.'),
})

type CreateGroupFormValues = z.infer<typeof createGroupSchema>

interface CreateGroupCardProps {
  isDisabled: boolean
  isSubmitting: boolean
  onSubmit: (values: CreateGroupFormValues) => Promise<void> | void
}

export function CreateGroupCard({ isDisabled, isSubmitting, onSubmit }: CreateGroupCardProps) {
  const form = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  const handleSubmit = async (values: CreateGroupFormValues) => {
    await onSubmit(values)
    form.reset()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a group</CardTitle>
        <CardDescription>Start a trip, home budget, dinner plan, or event and become its owner.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit((values) => void handleSubmit(values))}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground" htmlFor="group-name">
              Group name
            </label>
            <Input id="group-name" placeholder="Goa Trip" {...form.register('name')} />
            {form.formState.errors.name ? <p className="text-xs text-destructive">{form.formState.errors.name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground" htmlFor="group-description">
              Description
            </label>
            <Textarea id="group-description" placeholder="Flights, food, and stay shared across friends." {...form.register('description')} />
            {form.formState.errors.description ? <p className="text-xs text-destructive">{form.formState.errors.description.message}</p> : null}
          </div>
          <Button className="w-full sm:w-auto" type="submit" disabled={isDisabled || isSubmitting}>
            <Plus className="h-4 w-4" />
            Create group
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
